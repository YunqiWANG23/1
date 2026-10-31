/**
 * Haunted Room - Stage 1 (server side): photos/video -> objects -> puzzles -> rule check
 *
 * Put this file next to your Express server file (e.g. server.ts) and add the route
 * shown at the bottom. Gemini is called on the SERVER, so the API key never reaches the browser.
 *
 * Test without the API:  npx tsx gameGenerator.ts --mock
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// ---------------------------------------------------------------------------
// Types (this is the shared format - tell your partner these field names are fixed)
// ---------------------------------------------------------------------------
export type Owner = 'shared' | 'personal' | 'unclear';

export interface RoomObject {
  id: string;
  name: string;
  color: string;
  location: string;
  portable: boolean;
  camera_distinct: number; // 1-5
  owner: Owner;
  safe: boolean;
  timestamp?: string; // mm:ss, only when the input is a video
  image_ref?: { photo_index: number; box_2d: [number, number, number, number] }; // [ymin,xmin,ymax,xmax], 0-1000
  rejected_because?: string[];
}

export interface Inventory {
  room_summary: string;
  landmarks: string[];
  objects: RoomObject[];
}

export interface Puzzle {
  id: string;
  clue: string;
  solve_by: 'show_object';
  target: string;
  reward_digit: string;
  hints: string[];
  why_it_works: string;
}

export interface Game {
  title: string;
  intro: string;
  puzzles: Puzzle[];
  final_code: string;
  outro: string;
}

export interface EventInfo {
  organiser: string;
  players: number;
  teams: number;
  minutes: number;
  scare_level: 'kid-friendly' | 'spooky but not scary' | 'hardcore';
}

export interface MediaFile {
  mimeType: string; // e.g. 'image/jpeg' or 'video/mp4'
  base64: string;
}

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------
const INVENTORY_PROMPT = `You are looking at photos or a video of ONE real room.
List 15-25 distinct physical objects visible in the room.

Return ONLY valid JSON in this exact shape:
{
  "room_summary": "one sentence describing the room",
  "landmarks": ["big, easy-to-find features like 'the whiteboard', 'the window'"],
  "objects": [
    {
      "id": "snake_case_unique_id",
      "name": "short name",
      "color": "main colour",
      "location": "position relative to a landmark, e.g. 'on the windowsill, left of the plant'",
      "portable": true,
      "camera_distinct": 4,
      "owner": "shared",
      "safe": true,
      "timestamp": "00:12",
      "image_ref": {"photo_index": 0, "box_2d": [410, 220, 520, 300]}
    }
  ]
}
Field meanings:
- portable: one person can pick it up and hold it to a webcam.
- camera_distinct: 1-5, how easy to recognise when held up to a webcam.
- owner: "shared" = belongs to the room or the event (stationery, catering, decorations);
         "personal" = clearly belongs to one person (bags, phones, laptops, earbuds, jackets, someone's drink);
         "unclear" = cannot tell.
- safe: safe to pick up (not high up, not plugged in, not fragile or sharp).
- timestamp: only for video input, the mm:ss where the object is seen most clearly; omit for photos.
- image_ref: where the object is in the input. For photos, photo_index is which photo (0 = first) shows it
  most clearly. For video, photo_index is 0 and the box refers to the frame at "timestamp".
  box_2d is [ymin, xmin, ymax, xmax] in 0-1000 coordinates of that photo/frame (0,0 = top-left).
Every location must mention one landmark. Only list objects clearly visible. Do not list people.
If unsure about a field, choose the cautious value.`;

function puzzlePrompt(event: EventInfo, usable: RoomObject[], landmarks: string[], n: number) {
  return `You are designing a short Halloween escape game played in a REAL room.
Players solve each puzzle by finding a real object in the room and holding it up to a webcam,
where a ghost character (an AI watching the camera) checks it.

Event: ${JSON.stringify(event)}
Usable objects: ${JSON.stringify(usable)}
Room landmarks: ${landmarks.join(', ')}

Design exactly ${n} puzzles. Rules:
- Each puzzle targets a DIFFERENT object from the list above (use its exact id).
- Pick targets that do not look alike, so the webcam cannot confuse them.
- The clue is a short spooky riddle spoken by the ghost. Describe the object by its traits,
  colour or location relative to a landmark. NEVER say the object's name directly.
- Each puzzle rewards one digit of the final code. The final code is the digits in puzzle order.
- Give two hints per puzzle: hint 1 is vague, hint 2 almost gives it away.
- Never require climbing, leaving the room, electrical items or other people's belongings.
- Match the tone to the scare level: ${event.scare_level}.

Return ONLY valid JSON in this exact shape:
{"title": "", "intro": "2-3 sentences the ghost says at the start",
 "puzzles": [{"id": "p1", "clue": "", "solve_by": "show_object", "target": "object_id",
   "reward_digit": "7", "hints": ["vague", "strong"], "why_it_works": "one line"}],
 "final_code": "", "outro": "what the ghost says when players escape"}`;
}

// ---------------------------------------------------------------------------
// Gemini call (server side). If this errors, ask the AI Studio Build agent:
// "Fix ONLY callGemini() in gameGenerator.ts so it calls the given model with these
//  media files and thinking level, using the current @google/genai SDK."
// ---------------------------------------------------------------------------
export async function callGemini(
  model: string,
  prompt: string,
  media: MediaFile[] = [],
  thinkingLevel: 'low' | 'medium' | 'high' = 'medium',
): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const levelMap: Record<'low' | 'medium' | 'high', ThinkingLevel> = {
    low: ThinkingLevel.LOW,
    medium: ThinkingLevel.MEDIUM,
    high: ThinkingLevel.HIGH,
  };

  const parts = [
    ...media.map((m) => ({
      inlineData: {
        mimeType: m.mimeType,
        data: m.base64.replace(/^data:[^;]+;base64,/, ''),
      },
    })),
    { text: prompt },
  ];

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: levelMap[thinkingLevel] ?? ThinkingLevel.MEDIUM },
    },
  });
  return response.text ?? '';
}

export const callArgon = (prompt: string, media: MediaFile[] = [], thinkingLevel: 'low' | 'medium' | 'high' = 'medium') =>
  callGemini('gemini-4-argon', prompt, media, thinkingLevel);

export function parseJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in model output: ' + text.slice(0, 300));
  return JSON.parse(match[0]) as T;
}

// ---------------------------------------------------------------------------
// Helper for the 3D/visual side: convert box_2d to pixel coordinates on an image
// ---------------------------------------------------------------------------
export function boxToPixels(box: [number, number, number, number], width: number, height: number) {
  const [ymin, xmin, ymax, xmax] = box;
  const x = (xmin / 1000) * width;
  const y = (ymin / 1000) * height;
  const w = ((xmax - xmin) / 1000) * width;
  const h = ((ymax - ymin) / 1000) * height;
  return { x, y, w, h, centerX: x + w / 2, centerY: y + h / 2 };
}

// ---------------------------------------------------------------------------
// Filter (first safety gate) and deterministic rule check (no AI)
// ---------------------------------------------------------------------------
export function filterObjects(objects: RoomObject[], approvedIds: string[] = [], minDistinct = 3) {
  const usable: RoomObject[] = [];
  const rejected: RoomObject[] = [];
  for (const o of objects) {
    const reasons: string[] = [];
    const ownerOk = o.owner === 'shared' || approvedIds.includes(o.id); // organiser can approve personal/unclear items
    if (!o.portable) reasons.push('not portable');
    if (!ownerOk) reasons.push(o.owner === 'personal' ? 'personal belonging' : 'owner unclear');
    if (!o.safe) reasons.push('unsafe to pick up');
    if ((o.camera_distinct ?? 0) < minDistinct) reasons.push('hard to recognise on camera');
    if (reasons.length) rejected.push({ ...o, rejected_because: reasons });
    else usable.push(o);
  }
  return { usable, rejected };
}

export function ruleCheck(game: Game, usable: RoomObject[]) {
  const ids = new Set(usable.map((o) => o.id));
  const problems: string[] = [];
  const seen = new Set<string>();
  if (!game.puzzles?.length) problems.push('No puzzles generated.');

  for (const p of game.puzzles ?? []) {
    if (!ids.has(p.target)) problems.push(`${p.id}: target '${p.target}' is not a usable object in this room.`);
    if (seen.has(p.target)) problems.push(`${p.id}: target '${p.target}' is used by more than one puzzle.`);
    seen.add(p.target);
    if (!p.clue) problems.push(`${p.id}: missing clue.`);
    if ((p.hints ?? []).length < 2) problems.push(`${p.id}: needs two hints.`);
    if (!/^\d$/.test(String(p.reward_digit))) problems.push(`${p.id}: reward_digit must be one digit.`);
    const obj = usable.find((o) => o.id === p.target);
    if (obj && p.clue?.toLowerCase().includes(obj.name.toLowerCase()))
      problems.push(`${p.id}: clue says the object name '${obj.name}' directly.`);
  }
  const expected = (game.puzzles ?? []).map((p) => p.reward_digit).join('');
  if (game.final_code !== expected)
    problems.push(
      `UNESCAPABLE: the puzzles give the digits '${expected}' but the door code is '${game.final_code}'. This game can never be won.`,
    );

  return { passed: problems.length === 0, problems };
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------
export async function generateGame(opts: {
  media: MediaFile[];
  event: EventInfo;
  approvedIds?: string[];
  numPuzzles?: number;
  mock?: boolean;
}) {
  const inventory = opts.mock
    ? MOCK_INVENTORY
    : parseJson<Inventory>(await callArgon(INVENTORY_PROMPT, opts.media, 'medium'));

  const { usable, rejected } = filterObjects(inventory.objects, opts.approvedIds ?? []);

  const game = opts.mock
    ? MOCK_GAME
    : parseJson<Game>(
        await callArgon(puzzlePrompt(opts.event, usable, inventory.landmarks, opts.numPuzzles ?? 4), [], 'high'),
      );

  const rule_check = ruleCheck(game, usable);
  return { event: opts.event, inventory, usable_objects: usable, rejected_objects: rejected, game, rule_check };
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
// Mock objects include image_ref so your partner can test markers without the API.
export const MOCK_INVENTORY: Inventory = {
  room_summary: 'A university classroom with rows of desks facing a whiteboard.',
  landmarks: ['the whiteboard', 'the window', 'the front desk'],
  objects: [
    { id: 'red_apple', name: 'red apple', color: 'red', location: 'on the front desk, right side', portable: true, camera_distinct: 5, owner: 'shared', safe: true, image_ref: { photo_index: 0, box_2d: [520, 610, 600, 680] } },
    { id: 'green_sticky_notes', name: 'sticky notes', color: 'green', location: 'below the whiteboard', portable: true, camera_distinct: 4, owner: 'shared', safe: true, image_ref: { photo_index: 0, box_2d: [450, 300, 500, 350] } },
    { id: 'blue_marker', name: 'blue marker pen', color: 'blue', location: 'whiteboard tray', portable: true, camera_distinct: 3, owner: 'shared', safe: true, image_ref: { photo_index: 0, box_2d: [430, 380, 450, 430] } },
    { id: 'orange_folder', name: 'orange folder', color: 'orange', location: 'by the window, second desk', portable: true, camera_distinct: 5, owner: 'shared', safe: true, image_ref: { photo_index: 1, box_2d: [600, 700, 700, 820] } },
    { id: 'red_folder', name: 'red folder', color: 'red', location: 'on the bookshelf by the door', portable: true, camera_distinct: 5, owner: 'shared', safe: true, image_ref: { photo_index: 1, box_2d: [300, 100, 400, 200] } },
    { id: 'tan_backpack_desk', name: 'tan backpack', color: 'tan', location: 'third row by the window', portable: true, camera_distinct: 4, owner: 'personal', safe: true },
    { id: 'pret_coffee_cup', name: 'coffee cup', color: 'white', location: 'front desk', portable: true, camera_distinct: 4, owner: 'personal', safe: true },
  ],
};

export const MOCK_GAME: Game = {
  title: 'The Last Lecture',
  intro: 'Welcome, mortals. I taught in this room until the night I vanished. Find what I left behind.',
  puzzles: [
    { id: 'p1', clue: 'Forbidden fruit, the colour of blood, waits where the teacher once stood.', solve_by: 'show_object', target: 'red_apple', reward_digit: '7', hints: ['Look at the front.', 'Something you could eat.'], why_it_works: 'Red + fruit + front desk.' },
    { id: 'p2', clue: 'My last thoughts are stuck in squares the colour of moss, beneath the board.', solve_by: 'show_object', target: 'green_sticky_notes', reward_digit: '3', hints: ['Small squares of paper.', 'Green, under the whiteboard.'], why_it_works: 'Green + small squares + below whiteboard.' },
    { id: 'p3', clue: 'I wrote my secrets in ink the colour of a drowned sky.', solve_by: 'show_object', target: 'blue_marker', reward_digit: '1', hints: ['Something you write with.', 'Blue, on the whiteboard tray.'], why_it_works: 'Blue + writing tool.' },
    { id: 'p4', clue: 'My final papers hide in a pumpkin-coloured skin, near the glass.', solve_by: 'show_object', target: 'orange_folder', reward_digit: '4', hints: ['Papers are kept in it.', 'Orange, near the window.'], why_it_works: 'Orange + holds papers + window.' },
  ],
  final_code: '7314',
  outro: 'You have set me free. Happy Halloween.',
};

// ---------------------------------------------------------------------------
// CLI test:  npx tsx gameGenerator.ts --mock
// ---------------------------------------------------------------------------
const isMain = typeof process !== 'undefined' && process.argv[1]?.includes('gameGenerator');
if (isMain && process.argv.includes('--mock')) {
  const event: EventInfo = { organiser: 'REAL NAME HERE', players: 20, teams: 4, minutes: 15, scare_level: 'spooky but not scary' };
  generateGame({ media: [], event, mock: true }).then((r) => {
    console.log(`[objects] ${r.usable_objects.length} usable, ${r.rejected_objects.length} rejected`);
    r.rejected_objects.forEach((o) => console.log(`   - ${o.name}: ${o.rejected_because?.join(', ')}`));
    console.log(`[rule check] ${r.rule_check.passed ? 'PASSED' : 'FAILED'}`, r.rule_check.problems);
    const apple = r.usable_objects.find((o) => o.id === 'red_apple');
    if (apple?.image_ref) console.log('[marker] red_apple on 1600x1200 photo:', boxToPixels(apple.image_ref.box_2d, 1600, 1200));
  });
}

/* ---------------------------------------------------------------------------
   Express route - add this to your server file:

   import express from 'express';
   import { generateGame } from './gameGenerator';

   app.use(express.json({ limit: '60mb' }));   // photos/video come in as base64

   app.post('/api/generate-game', async (req, res) => {
     try {
       // body: { media: [{mimeType, base64}], event: {...}, approvedIds?: string[] }
       const result = await generateGame(req.body);
       res.json(result);
     } catch (e: any) {
       res.status(500).json({ error: e.message });
     }
   });
--------------------------------------------------------------------------- */
