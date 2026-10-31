/**
 * Haunted Room - Stage 1 (server side): photos/video -> objects -> puzzles -> rule check
 */

import { GoogleGenAI, ThinkingLevel } from '@google/genai';

// ---------------------------------------------------------------------------
// Types (shared format - field names are fixed)
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
  return `You are designing a short Halloween escape game played in a REAL room (reimagined in a Medieval Gothic Haunted Castle parallel world).
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
// Gemini call (server side)
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
  callGemini('gemini-3.8-pro', prompt, media, thinkingLevel);

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
// Imperial Lecture Theatre Authoritative Mock Data (Default 3D Parallel World)
// ---------------------------------------------------------------------------
export const LECTURE_HALL_INVENTORY: Inventory = {
  room_summary:
    'A large tiered university lecture theatre with blue upholstered seating, a central AV podium at the front, a whiteboard, and projection screens.',
  landmarks: [
    'the central AV podium',
    'the whiteboard',
    'the large projection screen',
    'the Halloween at Imperial roll-up banner',
    'the front-row long desks',
    'the tiered blue lecture seats',
    'the blue double exit doors',
  ],
  objects: [
    {
      id: 'haribo_tub_top',
      name: 'Haribo candy tub',
      color: 'blue and green',
      location: 'on top of the central AV podium, stacked on another tub',
      portable: true,
      camera_distinct: 5,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [335, 398, 412, 485] },
    },
    {
      id: 'paper_plates_stack',
      name: 'stack of paper plates',
      color: 'white',
      location: 'on the central AV podium, next to the Haribo tubs',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [390, 480, 432, 595] },
    },
    {
      id: 'plastic_cups_sleeve',
      name: 'sleeve of disposable cups',
      color: 'black and green',
      location: 'resting horizontally on top of the stack of paper plates on the podium',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [375, 485, 400, 585] },
    },
    {
      id: 'glass_swing_top_bottle',
      name: 'swing-top glass water bottle',
      color: 'clear',
      location: 'on the central AV podium, near the gooseneck microphone',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: false,
      image_ref: { photo_index: 5, box_2d: [530, 695, 665, 775] },
    },
    {
      id: 'pret_coffee_cup',
      name: 'Pret disposable coffee cup',
      color: 'white and burgundy',
      location: 'on the central AV podium, between the glass bottle and plastic water bottle',
      portable: true,
      camera_distinct: 4,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [355, 310, 388, 345] },
    },
    {
      id: 'small_water_bottle_podium',
      name: 'small plastic water bottle',
      color: 'clear and blue',
      location: 'on the edge of the central AV podium, next to the Pret coffee cup',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 5, box_2d: [530, 768, 602, 815] },
    },
    {
      id: 'red_whiteboard_marker',
      name: 'red marker pen',
      color: 'red and white',
      location: 'lying flat on the central AV podium between the keyboard and the coffee cup',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 5, box_2d: [550, 565, 562, 630] },
    },
    {
      id: 'podium_keyboard',
      name: 'wired computer keyboard',
      color: 'black',
      location: 'on the central AV podium, beneath the dual monitors',
      portable: false,
      camera_distinct: 4,
      owner: 'shared',
      safe: false,
      image_ref: { photo_index: 5, box_2d: [538, 418, 586, 612] },
    },
    {
      id: 'gooseneck_microphone',
      name: 'gooseneck desk microphone',
      color: 'black',
      location: 'on the right side of the central AV podium',
      portable: false,
      camera_distinct: 4,
      owner: 'shared',
      safe: false,
      image_ref: { photo_index: 5, box_2d: [468, 562, 656, 622] },
    },
    {
      id: 'pepsi_max_multipack',
      name: 'multipack of Pepsi Max cans',
      color: 'black and blue',
      location: 'on the floor directly in front of the central AV podium',
      portable: true,
      camera_distinct: 5,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [592, 235, 732, 466] },
    },
    {
      id: 'water_bottles_multipack',
      name: 'shrink-wrapped pack of water bottles',
      color: 'pink and clear',
      location: 'stacked on the floor against the front of the central AV podium',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [512, 310, 672, 604] },
    },
    {
      id: 'cardboard_box_under_podium',
      name: 'brown cardboard box',
      color: 'brown',
      location: 'on the floor under the left side of the central AV podium',
      portable: true,
      camera_distinct: 3,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [446, 124, 512, 266] },
    },
    {
      id: 'white_paper_carrier_bag',
      name: 'white paper gift bag',
      color: 'white',
      location: 'resting on the black box on top of the brown cardboard box under the podium',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 4, box_2d: [396, 162, 444, 255] },
    },
    {
      id: 'halloween_rollup_banner',
      name: 'Halloween at Imperial roll-up banner',
      color: 'black and orange',
      location: 'standing on the floor between the whiteboard and the central AV podium',
      portable: false,
      camera_distinct: 5,
      owner: 'shared',
      safe: false,
      image_ref: { photo_index: 0, box_2d: [388, 326, 816, 462] },
    },
    {
      id: 'white_backpack_floor',
      name: 'white backpack',
      color: 'white',
      location: 'on the carpet in front of the right-side front-row desk',
      portable: true,
      camera_distinct: 5,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 2, box_2d: [705, 518, 812, 650] },
    },
    {
      id: 'coconut_water_carton',
      name: 'tall drink carton',
      color: 'blue and white',
      location: 'standing on the right-side front-row desk',
      portable: true,
      camera_distinct: 5,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 2, box_2d: [558, 630, 604, 658] },
    },
    {
      id: 'tan_backpack_desk',
      name: 'tan and black backpack',
      color: 'tan',
      location: 'resting on the right end of the right-side front-row desk',
      portable: true,
      camera_distinct: 4,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 2, box_2d: [574, 782, 634, 940] },
    },
    {
      id: 'navy_tote_bag',
      name: 'navy shoulder bag with brown straps',
      color: 'navy blue and brown',
      location: 'on the left end of the right-side front-row desk',
      portable: true,
      camera_distinct: 4,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 2, box_2d: [562, 372, 618, 485] },
    },
    {
      id: 'pink_pouch',
      name: 'small pink zip pouch',
      color: 'pink',
      location: 'on the left end of the right-side front-row desk, next to the navy shoulder bag',
      portable: true,
      camera_distinct: 4,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 2, box_2d: [570, 352, 588, 384] },
    },
    {
      id: 'earbuds_charging_case',
      name: 'small black earbuds case',
      color: 'black',
      location: 'on the right-side front-row desk, to the right of the blue drink carton',
      portable: true,
      camera_distinct: 3,
      owner: 'personal',
      safe: true,
      image_ref: { photo_index: 2, box_2d: [594, 670, 605, 696] },
    },
    {
      id: 'orange_chair',
      name: 'orange lecture chair',
      color: 'orange',
      location: 'behind the podium near the whiteboard',
      portable: false,
      camera_distinct: 4,
      owner: 'shared',
      safe: false,
      image_ref: { photo_index: 5, box_2d: [484, 926, 582, 1000] },
    },
  ],
};

export const LECTURE_HALL_GAME: Game = {
  title: 'The Phantom Lecture of Imperial Hall',
  intro:
    'Welcome, brave scholars! Organiser Alex has accidentally awakened the mischievous Poltergeist of the Podium, trapping all 20 of you across your 4 teams inside this lecture theatre. You have just 15 minutes before the ghost locks the blue exit doors forever—solve these four spooky riddles by holding each cursed item up to the webcam to claim the four-digit banishing code!',
  puzzles: [
    {
      id: 'p1',
      clue: "I bleed crimson ink upon the great pale wall, yet I have no veins at all. Dressed in scarlet and bone-white, I rest flat upon the lecturer's silver altar between clacking keys and a warm brew.",
      solve_by: 'show_object',
      target: 'red_whiteboard_marker',
      reward_digit: '4',
      hints: [
        'Search the flat surface of the central AV podium near the keyboard.',
        'Pick up the small red-and-white writing tool lying between the keyboard and the coffee cup.',
      ],
      why_it_works:
        'It is lightweight, safe, and easy to hold up to the webcam, with a bright red cap and barrel that make it visually distinct from every other object.',
    },
    {
      id: 'p2',
      clue: "Twin round cauldrons of sapphire and emerald sit stacked upon the speaker's shrine. Inside my plastic belly, tiny gelatinous beasts and gummy ghouls await a sweet tooth—bring the upper vessel to the eye!",
      solve_by: 'show_object',
      target: 'haribo_tub_top',
      reward_digit: '9',
      hints: [
        'Look on the central AV podium for two colourful round containers stacked together.',
        'Grab the top blue-and-green plastic container of chewy sweets from the podium.',
      ],
      why_it_works:
        'The bright blue and green cylindrical container is large, colorful, completely safe to lift, and unmistakably recognizable on camera.',
    },
    {
      id: 'p3',
      clue: 'A tower of pale full moons rests beside the sweet cauldrons on the silver desk. We are flat, ghostly white circles waiting for a midnight feast, currently bearing a dark green cylinder upon our backs.',
      solve_by: 'show_object',
      target: 'paper_plates_stack',
      reward_digit: '2',
      hints: [
        'Check the central AV podium right next to the stacked sweet containers.',
        'Lift the stack of round white disposable tableware sitting under the sleeve of cups.',
      ],
      why_it_works:
        'Its bright white circular profile and ribbed stack texture contrast sharply with the colourful tub and thin red pen.',
    },
    {
      id: 'p4',
      clue: 'Crouching on the grey carpet right at the foot of the metal shrine, this dark shroud of midnight black and electric blue holds a fizzy, sugar-free potion trapped in cold aluminum tombs.',
      solve_by: 'show_object',
      target: 'pepsi_max_multipack',
      reward_digit: '7',
      hints: [
        'Look down on the floor directly in front of the central AV podium, beside the pink-wrapped water.',
        'Pick up the black-and-blue wrapped pack of dark fizzy drink cans from the carpet.',
      ],
      why_it_works:
        'Located on the floor in front of the podium, its bold black-and-blue branding and boxy shape make it distinct from the podium tabletop items and easy to recognise on a webcam.',
    },
  ],
  final_code: '4927',
  outro:
    'With the final digit entered—4-9-2-7—the projection screen flickers and the Poltergeist of the Podium vanishes in a puff of phantom chalk dust! Congratulations to all 4 teams, and thank you to Alex for guiding our 20 investigators to freedom with time to spare!',
};

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------
export async function generateGame(opts: {
  media: MediaFile[];
  event: EventInfo;
  approvedIds?: string[];
  numPuzzles?: number;
  mock?: boolean;
  preferLectureHall?: boolean;
}) {
  const useLectureHallMock = opts.mock && (opts.preferLectureHall !== false);
  const inventory = opts.mock
    ? useLectureHallMock
      ? LECTURE_HALL_INVENTORY
      : MOCK_INVENTORY
    : parseJson<Inventory>(await callArgon(INVENTORY_PROMPT, opts.media, 'medium'));

  const { usable, rejected } = filterObjects(inventory.objects, opts.approvedIds ?? []);

  const game = opts.mock
    ? useLectureHallMock
      ? LECTURE_HALL_GAME
      : MOCK_GAME
    : parseJson<Game>(
        await callArgon(puzzlePrompt(opts.event, usable, inventory.landmarks, opts.numPuzzles ?? 4), [], 'high'),
      );

  const rule_check = ruleCheck(game, usable);
  return { event: opts.event, inventory, usable_objects: usable, rejected_objects: rejected, game, rule_check };
}

// ---------------------------------------------------------------------------
// Mock data (used by broken-game demo & CLI tests)
// ---------------------------------------------------------------------------
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
