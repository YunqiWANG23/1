/**
 * Haunted Room - Stage 4: the Live ghost (BROWSER side).
 * Streams mic + webcam to gemini-3.8-live, plays the ghost's voice,
 * and routes its tool calls to gameState.ts (code decides right/wrong).
 *
 * The API key stays on the server: the browser asks /api/live-token for a short-lived token.
 * If connecting fails, compare with github.com/google-gemini/gemini-live-api-examples
 * or ask the AI Studio Build agent / a Google mentor to fix ONLY connect().
 */
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { Game, RoomObject } from './gameGenerator';
import { initialState, confirmObjectShown, checkCode, requestHint, type GameState, type ToolResult } from './gameState';

const LIVE_MODEL = 'gemini-3.8-live';

// ---------------------------------------------------------------------------
// Ghost instructions. NOTE: the ghost sees the object list but NOT which one is the answer.
// ---------------------------------------------------------------------------
function systemInstruction(game: Game, objects: RoomObject[]) {
  const list = objects.map((o) => `- ${o.id}: ${o.color} ${o.name} (${o.location})`).join('\n');
  return `You are the ghost host of a Halloween escape game called "${game.title}", played in a real room.
You can hear the players and see them through a webcam.
Personality: theatrical, eerie, playful, never truly frightening. Speak in short lines (max 2 sentences).

Objects in this room (id: description):
${list}

HOW THE GAME WORKS
- Start by saying this intro, then the first clue:
  Intro: "${game.intro}"
  First clue: "${game.puzzles[0].clue}"
- When a player HOLDS UP an object to the camera, call confirm_object_shown with the id from the list
  that best matches what you see. If it matches nothing on the list, use "unknown".
- You do NOT know the answers. NEVER say whether an object is right until confirm_object_shown replies.
  Then follow its "say" instruction and, if given, read "next_clue" aloud exactly.
- If players ask for help, seem stuck, or the tool says suggest_hint, call request_hint and say the hint in character.
- When players speak a door code, call check_code with the digits.
- Never reveal object ids. Never invent digits.`;
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'confirm_object_shown',
        description: 'Report which object a player is holding up to the camera.',
        parameters: {
          type: Type.OBJECT,
          properties: { object_id: { type: Type.STRING, description: 'id from the object list, or "unknown"' } },
          required: ['object_id'],
        },
      },
      {
        name: 'check_code',
        description: 'Check the door code the players spoke.',
        parameters: { type: Type.OBJECT, properties: { code: { type: Type.STRING } }, required: ['code'] },
      },
      { name: 'request_hint', description: 'Get the next hint for the current puzzle.' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Small audio/video helpers
// ---------------------------------------------------------------------------
function toBase64(bytes: Uint8Array) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function floatTo16BitPCM(input: Float32Array) {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) out[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
  return new Uint8Array(out.buffer);
}

export interface GhostCallbacks {
  onState: (s: GameState) => void;
  onTranscript: (who: 'ghost' | 'player', text: string) => void;
  onStatus: (status: string) => void;
}

export class GhostSession {
  private session: any;
  private state: GameState = initialState();
  private micCtx?: AudioContext;
  private outCtx?: AudioContext;
  private nextPlayTime = 0;
  private playing: AudioBufferSourceNode[] = [];
  private frameTimer?: number;
  private stream?: MediaStream;

  constructor(private game: Game, private objects: RoomObject[], private cb: GhostCallbacks, private video: HTMLVideoElement) {}

  getState() { return this.state; }

  async start() {
    this.cb.onStatus('Requesting camera and microphone...');
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
    this.video.srcObject = this.stream;
    await this.video.play();

    this.cb.onStatus('Connecting to the ghost...');
    await this.connect();
    this.startMic();
    this.startCamera();
  }

  private async connect() {
    const res = await fetch('/api/live-token', { method: 'POST' });
    const data = await res.json();
    if (!res.ok || !data.token) {
      throw new Error(data?.error || 'Failed to obtain ephemeral live token');
    }
    const ai = new GoogleGenAI({
      apiKey: data.token,
      httpOptions: {
        apiVersion: 'v1alpha',
        headers: { 'User-Agent': 'aistudio-build' },
      },
    });
    this.outCtx = new AudioContext({ sampleRate: 24000 });

    this.session = await ai.live.connect({
      model: LIVE_MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: systemInstruction(this.game, this.objects),
        tools: TOOLS as any,
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        // speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } }, // optional spooky voice
      },
      callbacks: {
        onopen: () => this.cb.onStatus('Ghost connected 👻'),
        onmessage: (msg: any) => this.handleMessage(msg),
        onerror: (e: any) => this.cb.onStatus('Error: ' + (e?.message ?? e)),
        onclose: () => this.cb.onStatus('Ghost disconnected'),
      },
    });

    // Kick off: ghost says the intro + first clue
    this.session.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: 'The players have arrived. Begin the game now.' }] }],
      turnComplete: true,
    });
  }

  private handleMessage(msg: any) {
    // 1. Ghost voice
    for (const part of msg.serverContent?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) this.playPcm(part.inlineData.data);
    }
    if (msg.serverContent?.interrupted) this.stopPlayback(); // player talked over the ghost

    // 2. Captions
    const out = msg.serverContent?.outputTranscription?.text;
    if (out) this.cb.onTranscript('ghost', out);
    const inp = msg.serverContent?.inputTranscription?.text;
    if (inp) this.cb.onTranscript('player', inp);

    // 3. Tool calls -> game logic decides
    const calls = msg.toolCall?.functionCalls ?? [];
    if (calls.length) {
      const functionResponses = calls.map((fc: any) => {
        const r = this.runTool(fc.name, fc.args ?? {});
        return { id: fc.id, name: fc.name, response: r.response };
      });
      this.session.sendToolResponse({ functionResponses });
    }
  }

  /** Also used by the UI's manual "simulate" buttons (backup if the camera misreads). */
  runTool(name: string, args: Record<string, string>): ToolResult {
    let r: ToolResult;
    if (name === 'confirm_object_shown') r = confirmObjectShown(this.game, this.state, args.object_id);
    else if (name === 'check_code') r = checkCode(this.game, this.state, args.code ?? '');
    else r = requestHint(this.game, this.state);
    this.state = r.state;
    this.cb.onState(this.state);
    return r;
  }

  /** Manual override for the organiser: tell the ghost an object was shown (e.g. camera misread). */
  forceObject(objectId: string) {
    const r = this.runTool('confirm_object_shown', { object_id: objectId });
    this.session?.sendClientContent({
      turns: [{ role: 'user', parts: [{ text: `[Game master] The players showed an object. Result: ${JSON.stringify(r.response)}. Follow the "say" instruction.` }] }],
      turnComplete: true,
    });
  }

  private startMic() {
    this.micCtx = new AudioContext({ sampleRate: 16000 });
    const src = this.micCtx.createMediaStreamSource(this.stream!);
    const proc = this.micCtx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => {
      const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
      this.session?.sendRealtimeInput({ audio: { data: toBase64(pcm), mimeType: 'audio/pcm;rate=16000' } });
    };
    src.connect(proc);
    proc.connect(this.micCtx.destination);
  }

  private startCamera() {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d')!;
    this.frameTimer = window.setInterval(() => {
      ctx.drawImage(this.video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      this.session?.sendRealtimeInput({ video: { data, mimeType: 'image/jpeg' } });
    }, 1000); // 1 frame per second is enough to see a held-up object
  }

  private playPcm(b64: string) {
    const ctx = this.outCtx!;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const buf = ctx.createBuffer(1, pcm.length, 24000);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    this.nextPlayTime = Math.max(this.nextPlayTime, ctx.currentTime);
    src.start(this.nextPlayTime);
    this.nextPlayTime += buf.duration;
    this.playing.push(src);
    src.onended = () => (this.playing = this.playing.filter((p) => p !== src));
  }

  private stopPlayback() {
    this.playing.forEach((p) => { try { p.stop(); } catch {} });
    this.playing = [];
    this.nextPlayTime = 0;
  }

  stop() {
    clearInterval(this.frameTimer);
    this.stopPlayback();
    this.session?.close();
    this.micCtx?.close();
    this.outCtx?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}

/* ---------------------------------------------------------------------------
   Server route (Express) - the key never leaves the server:

   import { GoogleGenAI } from '@google/genai';
   app.post('/api/live-token', async (_req, res) => {
     try {
       const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
       const expire = new Date(Date.now() + 30 * 60 * 1000).toISOString();
       const token = await ai.authTokens.create({
         config: { uses: 1, expireTime: expire, newSessionExpireTime: expire, httpOptions: { apiVersion: 'v1alpha' } },
       });
       res.json({ token: token.name });
     } catch (e: any) { res.status(500).json({ error: e.message }); }
   });
--------------------------------------------------------------------------- */
