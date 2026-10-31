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

export interface GenerateGameResponse {
  event: EventInfo;
  inventory: Inventory;
  usable_objects: RoomObject[];
  rejected_objects: RoomObject[];
  game: Game;
  rule_check: {
    passed: boolean;
    problems: string[];
  };
}

// Stage 2 Verifier types
export const PERSONAS = [
  {
    id: 'student',
    label: 'Tired student',
    emoji: '😴',
    style:
      'a tired university student who reads quickly and takes clues literally',
  },
  {
    id: 'non_native',
    label: 'Non-native speaker',
    emoji: '🌍',
    style:
      'someone whose first language is not English, who may miss idioms and wordplay',
  },
  {
    id: 'kid',
    label: '10-year-old',
    emoji: '🧒',
    style:
      'a 10-year-old child who knows simple words and obvious colours and shapes',
  },
] as const;

export interface Guess {
  persona: string;
  guess_id: string;
  correct: boolean;
  reasoning: string;
}

export type PuzzleVerdict = 'clear' | 'ok' | 'ambiguous' | 'too_hard';

export interface PuzzleTest {
  puzzle_id: string;
  target: string;
  guesses: Guess[];
  correct_count: number;
  verdict: PuzzleVerdict;
  problem?: string;
}

export interface VerifyReport {
  passed: boolean;
  rule_check: { passed: boolean; problems: string[] };
  playtest: PuzzleTest[];
  problems: string[];
}

export interface VerifyHistoryRound {
  round: number;
  game: Game;
  report: VerifyReport;
}

export interface VerifyAndFixResponse {
  final_game: Game;
  passed: boolean;
  history: VerifyHistoryRound[];
}

export interface ClueDiff {
  puzzle_id: string;
  before_clue: string;
  after_clue: string;
}

export interface RoundDiffSummary {
  fromRound: number;
  toRound: number;
  clueDiffs: ClueDiff[];
  finalCodeDiff: { before: string; after: string } | null;
}

export function computeRoundDiffs(
  history: VerifyHistoryRound[]
): RoundDiffSummary[] {
  const diffs: RoundDiffSummary[] = [];
  for (let i = 0; i < history.length - 1; i++) {
    const prev = history[i];
    const next = history[i + 1];
    const clueDiffs: ClueDiff[] = [];

    for (const nextPuzzle of next.game.puzzles) {
      const prevPuzzle = prev.game.puzzles.find(
        (p) => p.id === nextPuzzle.id
      );
      if (prevPuzzle && prevPuzzle.clue !== nextPuzzle.clue) {
        clueDiffs.push({
          puzzle_id: nextPuzzle.id,
          before_clue: prevPuzzle.clue,
          after_clue: nextPuzzle.clue,
        });
      }
    }

    const finalCodeDiff =
      prev.game.final_code !== next.game.final_code
        ? { before: prev.game.final_code, after: next.game.final_code }
        : null;

    diffs.push({
      fromRound: prev.round,
      toRound: next.round,
      clueDiffs,
      finalCodeDiff,
    });
  }
  return diffs;
}

export const SAMPLE_ROOM_PHOTOS: string[] = [
  '/assets/aistudio/66b4d17da84e833442799e90ba75d948_e0cd8c46.jpg',
  '/assets/aistudio/381a563b50e0ff89786249943527285c_6e2b27d5.jpg',
  '/assets/aistudio/0e6e756acc74fcecda6493eaed73ba9b_b2780edc.jpg',
  '/assets/aistudio/5b6d6bb36209dbbe9d5395e835df2643_2f587618.jpg',
  '/assets/aistudio/7a7bfd14a6fbc6c72f7bf7dd74ea2683_eaed18b6.jpg',
  '/assets/aistudio/be9c4334b922aafb0d09b31f73b2d1c6_f28a01ed.jpg',
];

export const MOCK_INVENTORY: Inventory = {
  room_summary:
    'A university classroom with rows of desks facing a whiteboard.',
  landmarks: ['the whiteboard', 'the window', 'the front desk'],
  objects: [
    {
      id: 'red_apple',
      name: 'red apple',
      color: 'red',
      location: 'on the front desk, right side',
      portable: true,
      camera_distinct: 5,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 0, box_2d: [520, 610, 600, 680] },
    },
    {
      id: 'green_sticky_notes',
      name: 'sticky notes',
      color: 'green',
      location: 'below the whiteboard',
      portable: true,
      camera_distinct: 4,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 0, box_2d: [450, 300, 500, 350] },
    },
    {
      id: 'blue_marker',
      name: 'blue marker pen',
      color: 'blue',
      location: 'whiteboard tray',
      portable: true,
      camera_distinct: 3,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 0, box_2d: [430, 380, 450, 430] },
    },
    {
      id: 'orange_folder',
      name: 'orange folder',
      color: 'orange',
      location: 'by the window, second desk',
      portable: true,
      camera_distinct: 5,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 1, box_2d: [600, 700, 700, 820] },
    },
    {
      id: 'red_folder',
      name: 'red folder',
      color: 'red',
      location: 'on the bookshelf by the door',
      portable: true,
      camera_distinct: 5,
      owner: 'shared',
      safe: true,
      image_ref: { photo_index: 1, box_2d: [300, 100, 400, 200] },
    },
    {
      id: 'tan_backpack_desk',
      name: 'tan backpack',
      color: 'tan',
      location: 'third row by the window',
      portable: true,
      camera_distinct: 4,
      owner: 'personal',
      safe: true,
    },
    {
      id: 'pret_coffee_cup',
      name: 'coffee cup',
      color: 'white',
      location: 'front desk',
      portable: true,
      camera_distinct: 4,
      owner: 'personal',
      safe: true,
    },
  ],
};

export const MOCK_USABLE_OBJECTS: RoomObject[] = MOCK_INVENTORY.objects.filter(
  (o) => o.owner === 'shared'
);

export const INVENTORY_DATA: Inventory = {
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
      location:
        'resting horizontally on top of the stack of paper plates on the podium',
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
      location:
        'on the central AV podium, between the glass bottle and plastic water bottle',
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
      location:
        'on the edge of the central AV podium, next to the Pret coffee cup',
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
      location:
        'lying flat on the central AV podium between the keyboard and the coffee cup',
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
      location:
        'stacked on the floor against the front of the central AV podium',
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
      location:
        'resting on the black box on top of the brown cardboard box under the podium',
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
      location:
        'standing on the floor between the whiteboard and the central AV podium',
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
      location:
        'on the left end of the right-side front-row desk, next to the navy shoulder bag',
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
      location:
        'on the right-side front-row desk, to the right of the blue drink carton',
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

export const GAME_DATA: Game = {
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

export function filterClientObjects(
  objects: RoomObject[],
  approvedIds: string[] = [],
  minDistinct = 3
) {
  const usable: RoomObject[] = [];
  const rejected: RoomObject[] = [];
  for (const o of objects) {
    const reasons: string[] = [];
    const ownerOk = o.owner === 'shared' || approvedIds.includes(o.id);
    if (!o.portable) reasons.push('not portable');
    if (!ownerOk)
      reasons.push(
        o.owner === 'personal' ? 'personal belonging' : 'owner unclear'
      );
    if (!o.safe) reasons.push('unsafe to pick up');
    if ((o.camera_distinct ?? 0) < minDistinct)
      reasons.push('hard to recognise on camera');
    if (reasons.length) rejected.push({ ...o, rejected_because: reasons });
    else usable.push(o);
  }
  return { usable, rejected };
}

const initialFiltered = filterClientObjects(INVENTORY_DATA.objects);

export const INITIAL_GAME_RESULT: GenerateGameResponse = {
  event: {
    organiser: 'Alex',
    players: 20,
    teams: 4,
    minutes: 15,
    scare_level: 'spooky but not scary',
  },
  inventory: INVENTORY_DATA,
  usable_objects: initialFiltered.usable,
  rejected_objects: initialFiltered.rejected,
  game: GAME_DATA,
  rule_check: {
    passed: true,
    problems: [],
  },
};

export const INITIAL_VERIFICATION_RESULT: VerifyAndFixResponse = {
  final_game: GAME_DATA,
  passed: true,
  history: [
    {
      round: 1,
      game: GAME_DATA,
      report: {
        passed: true,
        rule_check: { passed: true, problems: [] },
        playtest: GAME_DATA.puzzles.map((p) => ({
          puzzle_id: p.id,
          target: p.target,
          guesses: PERSONAS.map((persona) => ({
            persona: persona.id,
            guess_id: p.target,
            correct: true,
            reasoning: 'Only one object fits this clue.',
          })),
          correct_count: 3,
          verdict: 'clear',
        })),
        problems: [],
      },
    },
  ],
};
