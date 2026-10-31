/**
 * Haunted Room - Stage 4: the Live ghost (BROWSER side).
 * Streams mic + webcam to gemini-3.8-live, plays the ghost's voice,
 * and routes its tool calls to gameState.ts (code decides right/wrong).
 *
 * Also supports 100% Offline Demo Mode (`demoMode: true`) which never calls
 * `/api/live-token` and simulates theatrical Ghost narration locally.
 *
 * Spatial Investigation Integration:
 * - The Ghost acts as a guide, NOT an automatic clue/answer dispenser.
 * - Before a puzzle's Clue Anchor is discovered in the 3D world, the Ghost only
 *   shares the story intro and directional exploration guidance.
 * - Once the player investigates the Clue Anchor (`Press E` in 3D), the Ghost
 *   narrates the discovered riddle and unlocks real-world camera verification.
 */
import { GoogleGenAI, Modality, Type } from '@google/genai';
import type { Game, RoomObject } from './gameGenerator';
import {
  initialState,
  confirmObjectShown,
  checkCode,
  requestHint,
  type GameState,
  type ToolResult,
} from './gameState';

const LIVE_MODEL = 'gemini-3.8-live';

// ---------------------------------------------------------------------------
// Ghost instructions. NOTE: the ghost sees the object list but NOT which one is the answer,
// and does NOT see undiscovered puzzle clues until the player finds them in the 3D scene!
// ---------------------------------------------------------------------------
function systemInstruction(game: Game, objects: RoomObject[]) {
  const list = objects.map((o) => `- ${o.id}: ${o.color} ${o.name} (${o.location})`).join('\n');
  return `You are the ghost host of a Halloween escape game called "${game.title}", played in a real room and mirrored in a Medieval Gothic Haunted Castle parallel world.
You can hear the players and see them through a webcam.
Personality: theatrical, eerie, playful, never truly frightening. Speak in short lines (max 2 sentences).

Objects in this room (id: description):
${list}

HOW THE GAME WORKS
- Start by saying ONLY this intro, then tell the players to explore the 3D Gothic castle with WASD and press E at the first Clue Anchor to uncover the first riddle:
  Intro: "${game.intro}"
- NEVER reveal or invent a puzzle clue before the [Game master] notifies you that the players discovered the Clue Anchor in the 3D room.
- Once a Clue Anchor is discovered in the 3D world, read the discovered clue aloud and help the players reason about how the virtual castle location maps to their real room.
- When a player HOLDS UP an object to the camera, call confirm_object_shown with the id from the list
  that best matches what you see. If it matches nothing on the list, use "unknown".
- You do NOT know the answers. NEVER say whether an object is right until confirm_object_shown replies.
  When confirm_object_shown replies "correct", announce the broken curse and the revealed digit, and instruct the players to explore the 3D castle to locate the next Clue Anchor (do NOT read next_clue until they discover the next Clue Anchor in 3D!).
- If players ask for help after discovering a clue, call request_hint and say the hint in character.
- When players speak a door code, call check_code with the digits.
- Never reveal object ids or real-world object names before a puzzle is solved. Never invent digits.`;
}

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'confirm_object_shown',
        description: 'Report which object a player is holding up to the camera.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            object_id: {
              type: Type.STRING,
              description: 'id from the object list, or "unknown"',
            },
          },
          required: ['object_id'],
        },
      },
      {
        name: 'check_code',
        description: 'Check the door code the players spoke.',
        parameters: {
          type: Type.OBJECT,
          properties: { code: { type: Type.STRING } },
          required: ['code'],
        },
      },
      {
        name: 'request_hint',
        description: 'Get the next hint for the current puzzle.',
      },
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
  for (let i = 0; i < input.length; i++)
    out[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
  return new Uint8Array(out.buffer);
}

function speakOfflineLine(text: string) {
  try {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.pitch = 0.78;
      utter.rate = 0.96;
      window.speechSynthesis.speak(utter);
    }
  } catch {
    // Ignore speech synthesis errors in restricted environments
  }
}

export interface GhostCallbacks {
  onState: (s: GameState) => void;
  onTranscript: (who: 'ghost' | 'player', text: string) => void;
  onStatus: (status: string) => void;
}

export class GhostSession {
  private session: any;
  private state: GameState = initialState();
  private discoveredClues = new Set<string>();
  private narratedClues = new Set<string>();
  private micCtx?: AudioContext;
  private outCtx?: AudioContext;
  private nextPlayTime = 0;
  private playing: AudioBufferSourceNode[] = [];
  private frameTimer?: number;
  private stream?: MediaStream;
  private demoMode: boolean;

  constructor(
    private game: Game,
    private objects: RoomObject[],
    private cb: GhostCallbacks,
    private video: HTMLVideoElement,
    demoMode = false
  ) {
    this.demoMode = demoMode;
  }

  getState() {
    return this.state;
  }

  syncExternalState(nextState: GameState) {
    this.state = nextState;
  }

  syncDiscoveredClues(discovered: Set<string>) {
    this.discoveredClues = new Set(discovered);
  }

  /**
   * Called when the player walks up to a Clue Anchor in the 3D scene and presses E.
   * Unlocks the puzzle's clue for narration and real-world verification.
   */
  notifyClueDiscovered(
    puzzleId: string,
    clueText: string,
    anchorTitle?: string,
    spatialHint?: string
  ) {
    this.discoveredClues.add(puzzleId);
    if (this.narratedClues.has(puzzleId)) {
      return;
    }
    this.narratedClues.add(puzzleId);

    const anchorLabel = anchorTitle || 'ancient clue anchor';
    if (this.demoMode || !this.session) {
      const line = `You uncovered the ${anchorLabel}! Hear its inscription: "${clueText}"${
        spatialHint ? ` (${spatialHint})` : ''
      }`;
      this.cb.onTranscript('ghost', line);
      speakOfflineLine(`You uncovered the ${anchorLabel}! Hear its inscription: ${clueText}`);
    } else {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `[Game master] The players explored the 3D castle and investigated "${anchorLabel}" for puzzle ${puzzleId}. Read this discovered clue aloud in character: "${clueText}". Then remind them to find its real-world counterpart and hold it up to the camera.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    }
  }

  setDemoMode(val: boolean) {
    this.demoMode = val;
  }

  async start(initialObjective?: string) {
    const currentPuzzle = this.game.puzzles[this.state.index];
    const isFirstDiscovered =
      currentPuzzle && this.discoveredClues.has(currentPuzzle.id);

    if (this.demoMode) {
      // Offline Demo Mode: NEVER call /api/live-token!
      this.cb.onStatus('Starting Offline Demo Ghost (no API calls)...');
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          this.stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: 640, height: 480 },
          });
          this.video.srcObject = this.stream;
          await this.video.play();
        }
      } catch {
        // Camera is optional in Offline Demo Mode
      }
      this.cb.onStatus('Ghost connected (Offline Demo Mode) 👻');
      const guidance = isFirstDiscovered
        ? `You have already uncovered the active inscription: "${currentPuzzle.clue}"`
        : initialObjective
        ? `Explore the 3D castle with WASD: ${initialObjective}`
        : 'Explore the 3D Gothic hall with WASD and press E at the first Clue Anchor to uncover the first riddle!';
      const openingText = `${this.game.intro} ${guidance}`;
      this.cb.onTranscript('ghost', openingText);
      speakOfflineLine(openingText);
      return;
    }

    this.cb.onStatus('Requesting camera and microphone...');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: 640, height: 480 },
    });
    this.video.srcObject = this.stream;
    await this.video.play();

    this.cb.onStatus('Connecting to the ghost...');
    await this.connect(initialObjective);
    this.startMic();
    this.startCamera();
  }

  private async connect(initialObjective?: string) {
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
      },
      callbacks: {
        onopen: () => this.cb.onStatus('Ghost connected 👻'),
        onmessage: (msg: any) => this.handleMessage(msg),
        onerror: (e: any) => this.cb.onStatus('Error: ' + (e?.message ?? e)),
        onclose: () => this.cb.onStatus('Ghost disconnected'),
      },
    });

    const currentPuzzle = this.game.puzzles[this.state.index];
    const isDiscovered =
      currentPuzzle && this.discoveredClues.has(currentPuzzle.id);

    // Kick off: ghost says the intro + directional objective (never spoiling undiscovered clues!)
    this.session.sendClientContent({
      turns: [
        {
          role: 'user',
          parts: [
            {
              text: isDiscovered
                ? `The players have arrived and already discovered the current clue: "${currentPuzzle.clue}". Welcome them with the intro and read the clue.`
                : `The players have arrived. Say the intro, and tell them to explore the 3D castle with WASD to find the first Clue Anchor (${
                    initialObjective || 'near the western sanctum wall'
                  }) and press E to uncover the first riddle. Do NOT reveal the riddle yet.`,
            },
          ],
        },
      ],
      turnComplete: true,
    });
  }

  private handleMessage(msg: any) {
    // 1. Ghost voice
    for (const part of msg.serverContent?.modelTurn?.parts ?? []) {
      if (part.inlineData?.data) this.playPcm(part.inlineData.data);
    }
    if (msg.serverContent?.interrupted) this.stopPlayback();

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

  /**
   * Used by both Gemini Live tool calls and the UI's manual/demo simulation buttons.
   * Enforces the Spatial Investigation rule: players must discover the current puzzle's
   * Clue Anchor in the 3D world before verifying real-world objects or requesting hints.
   */
  runTool(name: string, args: Record<string, string>): ToolResult {
    const currentPuzzle = this.game.puzzles[this.state.index];
    const isCurrentClueDiscovered =
      !currentPuzzle || this.discoveredClues.has(currentPuzzle.id);

    if (
      (name === 'confirm_object_shown' || name === 'request_hint') &&
      currentPuzzle &&
      !isCurrentClueDiscovered
    ) {
      const blockedResult: ToolResult = {
        state: this.state,
        response: {
          result: 'clue_not_discovered',
          say: 'The inscription has not yet been uncovered! Explore the 3D castle with WASD and press E at the Clue Anchor before presenting an offering.',
        },
      };
      if (this.demoMode || !this.session) {
        const line =
          'Hold, mortal! You have not yet read the inscription in the 3D castle. Walk to the Clue Anchor and press E to uncover the riddle first!';
        this.cb.onTranscript('ghost', line);
        speakOfflineLine(line);
      }
      return blockedResult;
    }

    let r: ToolResult;
    if (name === 'confirm_object_shown') {
      r = confirmObjectShown(this.game, this.state, args.object_id);
      // Do not automatically leak `next_clue` to the Live model before the next 3D Clue Anchor is discovered
      if (r.response.result === 'correct' && r.response.next_clue) {
        const nextPuzzle = this.game.puzzles[r.state.index];
        if (nextPuzzle && !this.discoveredClues.has(nextPuzzle.id)) {
          r = {
            state: r.state,
            response: {
              ...r.response,
              next_clue: null,
              say: `Correct! Give the players the digit "${r.response.digit}". Tell them the curse on this relic is purified in the 3D castle, and instruct them to explore the 3D room with WASD and press E at the next Clue Anchor to uncover the next riddle.`,
            },
          };
        }
      }
    } else if (name === 'check_code') {
      r = checkCode(this.game, this.state, args.code ?? '');
    } else {
      r = requestHint(this.game, this.state);
    }
    this.state = r.state;
    this.cb.onState(this.state);

    // In Offline Demo Mode (or when Live session is not connected), generate theatrical Ghost feedback
    if (this.demoMode || !this.session) {
      this.narrateOfflineResult(name, args, r);
    }
    return r;
  }

  private narrateOfflineResult(
    name: string,
    args: Record<string, string>,
    r: ToolResult
  ) {
    const resp = r.response;
    if (name === 'confirm_object_shown') {
      if (resp.result === 'correct') {
        const digit = String(resp.digit ?? '');
        const allDone = r.state.allSolved
          ? ' All four seals are broken! Enter or speak the four-digit banishing code to unbar the castle gates!'
          : ' Watch the cursed relic purify in the 3D hall, then explore the castle and press E at the next Clue Anchor!';
        const line = `Ah! The parallel curse shatters! Claim the sacred digit ${digit}.${allDone}`;
        this.cb.onTranscript('ghost', line);
        speakOfflineLine(line);
      } else if (resp.result === 'wrong') {
        const hintNudge = resp.suggest_hint
          ? ' Call upon a hint if your mortal eyes are clouded.'
          : '';
        const line = `Foolish mortals! That earthly trinket holds no power over this seal.${hintNudge}`;
        this.cb.onTranscript('ghost', line);
        speakOfflineLine(line);
      } else if (resp.result === 'no_puzzle_left') {
        const line =
          'Every cursed relic has already been purified! Speak the final four-digit code!';
        this.cb.onTranscript('ghost', line);
        speakOfflineLine(line);
      }
    } else if (name === 'request_hint') {
      const hintText = String(resp.hint ?? 'Listen closely to the shadows...');
      const line = `Whisper from the shadows (Hint ${resp.hint_level ?? 1}): "${hintText}"`;
      this.cb.onTranscript('ghost', line);
      speakOfflineLine(line);
    } else if (name === 'check_code') {
      if (resp.result === 'escaped') {
        const line = String(resp.say ?? this.game.outro);
        this.cb.onTranscript('ghost', line);
        speakOfflineLine(line);
      } else {
        const line = `The iron bolts refuse "${args.code ?? ''}"! The sanctum doors remain sealed.`;
        this.cb.onTranscript('ghost', line);
        speakOfflineLine(line);
      }
    }
  }

  /** Manual override for the organiser: tell the ghost an object was shown. */
  forceObject(objectId: string) {
    this.cb.onTranscript('player', '[Holds real-world object up to the camera]');
    const r = this.runTool('confirm_object_shown', { object_id: objectId });
    if (!this.demoMode && this.session) {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `[Game master] The players showed an object. Result: ${JSON.stringify(
                  r.response
                )}. Follow the "say" instruction.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    }
  }

  requestGhostHint() {
    this.cb.onTranscript('player', 'Spirit, grant us a hint!');
    const r = this.runTool('request_hint', {});
    if (!this.demoMode && this.session && r.response.result !== 'clue_not_discovered') {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `[Game master] Players requested a hint. Result: ${JSON.stringify(
                  r.response
                )}. Speak this hint in character.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    }
  }

  submitDoorCode(code: string) {
    this.cb.onTranscript('player', `The banishing code is ${code}!`);
    const r = this.runTool('check_code', { code });
    if (!this.demoMode && this.session) {
      this.session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: `[Game master] Players spoke door code "${code}". Result: ${JSON.stringify(
                  r.response
                )}. Follow the "say" instruction.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    }
  }

  private startMic() {
    this.micCtx = new AudioContext({ sampleRate: 16000 });
    const src = this.micCtx.createMediaStreamSource(this.stream!);
    const proc = this.micCtx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => {
      const pcm = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
      this.session?.sendRealtimeInput({
        audio: { data: toBase64(pcm), mimeType: 'audio/pcm;rate=16000' },
      });
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
      this.session?.sendRealtimeInput({
        video: { data, mimeType: 'image/jpeg' },
      });
    }, 1000);
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
    this.playing.forEach((p) => {
      try {
        p.stop();
      } catch {}
    });
    this.playing = [];
    this.nextPlayTime = 0;
  }

  stop() {
    clearInterval(this.frameTimer);
    this.stopPlayback();
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}
    this.session?.close();
    this.micCtx?.close();
    this.outCtx?.close();
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}
