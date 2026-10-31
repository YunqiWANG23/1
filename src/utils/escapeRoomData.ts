import * as THREE from 'three';
import {
  EscapeGameData,
  EscapePuzzleItem,
  FurnitureType,
  InventoryData,
  InventoryObjectItem,
  ParallelObjectMapping,
  PuzzleObjectValidationResult,
  RoomEnvironmentData,
  SceneObject,
  SceneValidationReport,
} from '../types/scene';

export interface SceneRegistryEntry {
  id: string;
  name: string;
  interactive: boolean;
  puzzleId?: string;
  rewardDigit?: string;
  clue?: string;
  color: string;
  location: string;
  supportingSurface: string;
  photoIndex?: number;
  box2d?: [number, number, number, number];
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
  sceneObject: THREE.Object3D;
}

/**
 * Authoritative runtime registry of all 3D scene objects keyed by exact object ID.
 * Example: sceneObjectRegistry.get("red_whiteboard_marker")
 */
export const sceneObjectRegistry = new Map<string, SceneRegistryEntry>();

if (typeof window !== 'undefined') {
  (window as unknown as { sceneObjectRegistry: Map<string, SceneRegistryEntry> }).sceneObjectRegistry =
    sceneObjectRegistry;
}

/**
 * Default authoritative `game.json` provided by the teammate.
 */
export const DEFAULT_GAME_DATA: EscapeGameData = {
  title: 'The Phantom Lecture of Imperial Hall',
  intro:
    'Welcome, brave scholars! Organiser Alex has accidentally awakened the mischievous Poltergeist of the Podium, trapping all 20 of you across your 4 teams inside this lecture theatre. You have just 15 minutes before the ghost locks the blue exit doors forever—solve these four spooky riddles by holding each cursed item up to the webcam to claim the four-digit banishing code!',
  puzzles: [
    {
      id: 'p1',
      clue:
        "I bleed crimson ink upon the great pale wall, yet I have no veins at all. Dressed in scarlet and bone-white, I rest flat upon the lecturer's silver altar between clacking keys and a warm brew.",
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
      clue:
        "Twin round cauldrons of sapphire and emerald sit stacked upon the speaker's shrine. Inside my plastic belly, tiny gelatinous beasts and gummy ghouls await a sweet tooth—bring the upper vessel to the eye!",
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
      clue:
        'A tower of pale full moons rests beside the sweet cauldrons on the silver desk. We are flat, ghostly white circles waiting for a midnight feast, currently bearing a dark green cylinder upon our backs.',
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
      clue:
        'Crouching on the grey carpet right at the foot of the metal shrine, this dark shroud of midnight black and electric blue holds a fizzy, sugar-free potion trapped in cold aluminum tombs.',
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

/**
 * Default authoritative `inventory.json` provided by the teammate.
 */
export const DEFAULT_INVENTORY_DATA: InventoryData = {
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
      image_ref: {
        photo_index: 4,
        box_2d: [335, 398, 412, 485],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [390, 480, 432, 595],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [375, 485, 400, 585],
      },
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
      image_ref: {
        photo_index: 5,
        box_2d: [530, 695, 665, 775],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [355, 310, 388, 345],
      },
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
      image_ref: {
        photo_index: 5,
        box_2d: [530, 768, 602, 815],
      },
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
      image_ref: {
        photo_index: 5,
        box_2d: [550, 565, 562, 630],
      },
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
      image_ref: {
        photo_index: 5,
        box_2d: [538, 418, 586, 612],
      },
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
      image_ref: {
        photo_index: 5,
        box_2d: [468, 562, 656, 622],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [592, 235, 732, 466],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [512, 310, 672, 604],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [446, 124, 512, 266],
      },
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
      image_ref: {
        photo_index: 4,
        box_2d: [396, 162, 444, 255],
      },
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
      image_ref: {
        photo_index: 0,
        box_2d: [388, 326, 816, 462],
      },
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
      image_ref: {
        photo_index: 2,
        box_2d: [705, 518, 812, 650],
      },
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
      image_ref: {
        photo_index: 2,
        box_2d: [558, 630, 604, 658],
      },
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
      image_ref: {
        photo_index: 2,
        box_2d: [574, 782, 634, 940],
      },
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
      image_ref: {
        photo_index: 2,
        box_2d: [562, 372, 618, 485],
      },
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
      image_ref: {
        photo_index: 2,
        box_2d: [570, 352, 588, 384],
      },
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
      image_ref: {
        photo_index: 2,
        box_2d: [594, 670, 605, 696],
      },
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
      image_ref: {
        photo_index: 5,
        box_2d: [484, 926, 582, 1000],
      },
    },
  ],
};

interface SpatialPlacementSpec {
  type: FurnitureType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationY: number;
  primaryColor: string;
  secondaryColor: string;
  supportingSurface: string;
  preserveElevation: boolean;
}

/**
 * Authoritative multi-image 3D spatial placement map derived from:
 * - `inventory.objects[].location`
 * - `inventory.objects[].image_ref` (photo_index & 2D bounding boxes)
 * - Supporting surfaces in the Imperial College Lecture Theatre:
 *   1. Central AV Podium (`stainless_av_console`): x = 0.95, z = -6.90, width = 2.15, depth = 0.95, top countertop Y = 1.25m
 *   2. Floor around Central AV Podium: Y = 0.00m
 *   3. Right-side Front-Row Desk (`tier_1_right_bank`): Tier 1 floor Y = 0.28m, writing desk top Y = 0.28 + 0.74 = 1.02m, X = [3.65..7.30], desk strip Z = -3.10m
 */
const AUTHORITATIVE_SPATIAL_SPECS: Record<string, SpatialPlacementSpec> = {
  // --- CENTRAL AV PODIUM TOP SURFACE (Y = 1.25m) ---
  haribo_tub_top: {
    type: 'haribo_tub',
    x: 0.24,
    y: 1.36, // Stacked on top of lower Haribo tub (1.25m + 0.11m lower tub height)
    z: -6.82,
    width: 0.22,
    height: 0.12,
    depth: 0.22,
    rotationY: 15,
    primaryColor: '#0284C7',
    secondaryColor: '#16A34A',
    supportingSurface: 'central_av_podium (stacked on lower Haribo tub, y=1.36m)',
    preserveElevation: true,
  },
  paper_plates_stack: {
    type: 'paper_plates',
    x: 0.54,
    y: 1.25, // Direct on AV podium countertop beside Haribo tubs
    z: -6.76,
    width: 0.24,
    height: 0.085,
    depth: 0.24,
    rotationY: 0,
    primaryColor: '#F8FAFC',
    secondaryColor: '#E2E8F0',
    supportingSurface: 'central_av_podium (countertop, y=1.25m)',
    preserveElevation: true,
  },
  plastic_cups_sleeve: {
    type: 'cups_sleeve',
    x: 0.54,
    y: 1.335, // Resting horizontally on top of paper_plates_stack (1.25m + 0.085m)
    z: -6.76,
    width: 0.28,
    height: 0.08,
    depth: 0.09,
    rotationY: 8,
    primaryColor: '#15803D',
    secondaryColor: '#18181B',
    supportingSurface: 'paper_plates_stack on central_av_podium (y=1.335m)',
    preserveElevation: true,
  },
  podium_keyboard: {
    type: 'keyboard_prop',
    x: 0.98,
    y: 1.25,
    z: -6.72,
    width: 0.44,
    height: 0.028,
    depth: 0.16,
    rotationY: 0,
    primaryColor: '#18181B',
    secondaryColor: '#3F3F46',
    supportingSurface: 'central_av_podium (countertop beneath dual monitors, y=1.25m)',
    preserveElevation: true,
  },
  red_whiteboard_marker: {
    type: 'marker_pen',
    x: 1.32,
    y: 1.25, // Lying flat on the central AV podium between keyboard (0.98) and Pret coffee cup (1.52)
    z: -6.73,
    width: 0.15,
    height: 0.026,
    depth: 0.036,
    rotationY: -18,
    primaryColor: '#DC2626',
    secondaryColor: '#F8FAFC',
    supportingSurface: 'central_av_podium (countertop between keyboard & coffee cup, y=1.25m)',
    preserveElevation: true,
  },
  pret_coffee_cup: {
    type: 'coffee_cup',
    x: 1.52,
    y: 1.25,
    z: -6.78,
    width: 0.095,
    height: 0.135,
    depth: 0.095,
    rotationY: 0,
    primaryColor: '#7F1D1D',
    secondaryColor: '#F8FAFC',
    supportingSurface: 'central_av_podium (countertop, y=1.25m)',
    preserveElevation: true,
  },
  glass_swing_top_bottle: {
    type: 'glass_bottle',
    x: 1.44,
    y: 1.25,
    z: -6.96,
    width: 0.095,
    height: 0.28,
    depth: 0.095,
    rotationY: 0,
    primaryColor: '#E0F2FE',
    secondaryColor: '#DC2626',
    supportingSurface: 'central_av_podium (countertop near gooseneck mic, y=1.25m)',
    preserveElevation: true,
  },
  small_water_bottle_podium: {
    type: 'water_bottle_small',
    x: 1.72,
    y: 1.25,
    z: -6.75,
    width: 0.08,
    height: 0.21,
    depth: 0.08,
    rotationY: 0,
    primaryColor: '#38BDF8',
    secondaryColor: '#1D4ED8',
    supportingSurface: 'central_av_podium (right edge next to Pret cup, y=1.25m)',
    preserveElevation: true,
  },
  gooseneck_microphone: {
    type: 'microphone_prop',
    x: 1.62,
    y: 1.25,
    z: -6.62,
    width: 0.14,
    height: 0.46,
    depth: 0.14,
    rotationY: 0,
    primaryColor: '#18181B',
    secondaryColor: '#EF4444',
    supportingSurface: 'central_av_podium (right side, y=1.25m)',
    preserveElevation: true,
  },

  // --- FLOOR IN FRONT OF / UNDER CENTRAL AV PODIUM (Y = 0.00m) ---
  pepsi_max_multipack: {
    type: 'pepsi_multipack',
    x: 0.56,
    y: 0.0,
    z: -6.12, // Floor directly in front of the central AV podium (z = -6.90, depth = 0.95 -> front face at -6.425)
    width: 0.44,
    height: 0.26,
    depth: 0.30,
    rotationY: 12,
    primaryColor: '#0F172A',
    secondaryColor: '#2563EB',
    supportingSurface: 'floor_carpet (directly in front of central_av_podium, y=0.00m)',
    preserveElevation: true,
  },
  water_bottles_multipack: {
    type: 'water_multipack',
    x: 1.16,
    y: 0.0,
    z: -6.16, // Stacked on the floor against the front of the central AV podium beside Pepsi Max
    width: 0.54,
    height: 0.44,
    depth: 0.36,
    rotationY: -4,
    primaryColor: '#DB2777',
    secondaryColor: '#BAE6FD',
    supportingSurface: 'floor_carpet (against front of central_av_podium, y=0.00m)',
    preserveElevation: true,
  },
  cardboard_box_under_podium: {
    type: 'cardboard_box_prop',
    x: -0.26,
    y: 0.0,
    z: -6.88, // Floor under the left side of the central AV podium
    width: 0.46,
    height: 0.36,
    depth: 0.38,
    rotationY: 6,
    primaryColor: '#A16207',
    secondaryColor: '#18181B',
    supportingSurface: 'floor_carpet (under left side of central_av_podium, y=0.00m)',
    preserveElevation: true,
  },
  white_paper_carrier_bag: {
    type: 'paper_carrier_bag',
    x: -0.26,
    y: 0.36, // Resting on top of the black/brown box stack under the left side of podium
    z: -6.88,
    width: 0.26,
    height: 0.32,
    depth: 0.14,
    rotationY: 10,
    primaryColor: '#F8FAFC',
    secondaryColor: '#CBD5E1',
    supportingSurface: 'cardboard_box_under_podium (stacked at y=0.36m)',
    preserveElevation: true,
  },

  // --- FLOOR BETWEEN WHITEBOARD AND CENTRAL AV PODIUM (Y = 0.00m) ---
  halloween_rollup_banner: {
    type: 'rollup_banner',
    x: -1.85,
    y: 0.0,
    z: -6.95,
    width: 0.88,
    height: 2.08,
    depth: 0.38,
    rotationY: 22,
    primaryColor: '#18141C',
    secondaryColor: '#F97316',
    supportingSurface: 'floor_carpet (between whiteboard and central_av_podium, y=0.00m)',
    preserveElevation: true,
  },
  orange_chair: {
    type: 'chair',
    x: -0.85,
    y: 0.0,
    z: -8.35,
    width: 0.58,
    height: 0.84,
    depth: 0.58,
    rotationY: 0,
    primaryColor: '#EA580C',
    secondaryColor: '#1E293B',
    supportingSurface: 'floor_carpet (behind podium near whiteboard, y=0.00m)',
    preserveElevation: true,
  },

  // --- RIGHT-SIDE FRONT-ROW DESK (`tier_1_right_bank`, Tier 1 Y=0.28m, Desk Top Y=1.02m, Z=-3.10m) ---
  white_backpack_floor: {
    type: 'backpack_prop',
    x: 5.15,
    y: 0.0, // On the carpet directly in front of the right-side front-row desk (z = -3.82 < startZ -3.5)
    z: -3.82,
    width: 0.38,
    height: 0.44,
    depth: 0.24,
    rotationY: -12,
    primaryColor: '#F1F5F9',
    secondaryColor: '#475569',
    supportingSurface: 'floor_carpet (in front of right-side front-row desk, y=0.00m)',
    preserveElevation: true,
  },
  pink_pouch: {
    type: 'zip_pouch',
    x: 3.92,
    y: 1.02, // Left end of right-side front-row desk (X spans 3.65 to 7.30), next to navy shoulder bag
    z: -3.10,
    width: 0.16,
    height: 0.075,
    depth: 0.10,
    rotationY: 14,
    primaryColor: '#F472B6',
    secondaryColor: '#FBCFE8',
    supportingSurface: 'tier_1_right_bank_desk (left end of right front-row desk, y=1.02m)',
    preserveElevation: true,
  },
  navy_tote_bag: {
    type: 'tote_bag',
    x: 4.28,
    y: 1.02, // Left end of right-side front-row desk
    z: -3.10,
    width: 0.42,
    height: 0.24,
    depth: 0.24,
    rotationY: -8,
    primaryColor: '#1E3A8A',
    secondaryColor: '#78350F',
    supportingSurface: 'tier_1_right_bank_desk (left end of right front-row desk, y=1.02m)',
    preserveElevation: true,
  },
  coconut_water_carton: {
    type: 'drink_carton',
    x: 5.38,
    y: 1.02, // Standing on the right-side front-row desk
    z: -3.10,
    width: 0.085,
    height: 0.22,
    depth: 0.085,
    rotationY: 0,
    primaryColor: '#0284C7',
    secondaryColor: '#FFFFFF',
    supportingSurface: 'tier_1_right_bank_desk (right front-row desk surface, y=1.02m)',
    preserveElevation: true,
  },
  earbuds_charging_case: {
    type: 'earbuds_case',
    x: 5.58,
    y: 1.02, // To the right of the blue drink carton on the right-side front-row desk
    z: -3.10,
    width: 0.068,
    height: 0.036,
    depth: 0.052,
    rotationY: 20,
    primaryColor: '#18181B',
    secondaryColor: '#10B981',
    supportingSurface: 'tier_1_right_bank_desk (right of drink carton, y=1.02m)',
    preserveElevation: true,
  },
  tan_backpack_desk: {
    type: 'backpack_prop',
    x: 6.72,
    y: 1.02, // Resting on the right end of the right-side front-row desk
    z: -3.10,
    width: 0.42,
    height: 0.34,
    depth: 0.28,
    rotationY: -18,
    primaryColor: '#C29B61',
    secondaryColor: '#18181B',
    supportingSurface: 'tier_1_right_bank_desk (right end of right front-row desk, y=1.02m)',
    preserveElevation: true,
  },

  // --- MOCK_INVENTORY / BROKEN_GAME CLASSROOM OBJECTS ---
  red_apple: {
    type: 'blood_pomegranate',
    x: 1.65,
    y: 1.25,
    z: -6.68,
    width: 0.14,
    height: 0.12,
    depth: 0.14,
    rotationY: 0,
    primaryColor: '#DC2626',
    secondaryColor: '#C9A24B',
    supportingSurface: 'central_av_podium (front ritual altar right side, y=1.25m)',
    preserveElevation: true,
  },
  green_sticky_notes: {
    type: 'moss_vellum_slips',
    x: -3.35,
    y: 0.82,
    z: -9.85,
    width: 0.18,
    height: 0.04,
    depth: 0.18,
    rotationY: 8,
    primaryColor: '#16A34A',
    secondaryColor: '#D97706',
    supportingSurface: 'sliding_whiteboard_system (cursed monolith ledge, y=0.82m)',
    preserveElevation: true,
  },
  blue_marker: {
    type: 'marker_pen',
    x: -2.75,
    y: 0.82,
    z: -9.85,
    width: 0.16,
    height: 0.03,
    depth: 0.04,
    rotationY: 0,
    primaryColor: '#0284C7',
    secondaryColor: '#F8FAFC',
    supportingSurface: 'sliding_whiteboard_system (cursed monolith tray, y=0.82m)',
    preserveElevation: true,
  },
  orange_folder: {
    type: 'grimoire_folio',
    x: 5.95,
    y: 1.02,
    z: -3.10,
    width: 0.28,
    height: 0.045,
    depth: 0.22,
    rotationY: -10,
    primaryColor: '#EA580C',
    secondaryColor: '#C9A24B',
    supportingSurface: 'tier_1_right_bank_desk (scriptorium bench by window, y=1.02m)',
    preserveElevation: true,
  },
  red_folder: {
    type: 'grimoire_folio',
    x: -2.15,
    y: 0.78,
    z: -8.35,
    width: 0.28,
    height: 0.045,
    depth: 0.22,
    rotationY: 12,
    primaryColor: '#DC2626',
    secondaryColor: '#C9A24B',
    supportingSurface: 'presenter_side_table (side oak table near exit, y=0.78m)',
    preserveElevation: true,
  },
  haribo_Gummies: {
    type: 'haribo_tub',
    x: 0.24,
    y: 1.36,
    z: -6.82,
    width: 0.22,
    height: 0.12,
    depth: 0.22,
    rotationY: 15,
    primaryColor: '#0284C7',
    secondaryColor: '#16A34A',
    supportingSurface: 'central_av_podium (stacked on lower cauldron, y=1.36m)',
    preserveElevation: true,
  },
  colourful_keychain: {
    type: 'keychain_prop',
    x: 1.18,
    y: 1.25,
    z: -6.82,
    width: 0.12,
    height: 0.04,
    depth: 0.12,
    rotationY: 24,
    primaryColor: '#EAB308',
    secondaryColor: '#DC2626',
    supportingSurface: 'central_av_podium (countertop, y=1.25m)',
    preserveElevation: true,
  },
  black_wallet: {
    type: 'grimoire_folio',
    x: 4.65,
    y: 1.02,
    z: -3.10,
    width: 0.18,
    height: 0.04,
    depth: 0.14,
    rotationY: -12,
    primaryColor: '#18181B',
    secondaryColor: '#C9A24B',
    supportingSurface: 'tier_1_right_bank_desk (scriptorium bench, y=1.02m)',
    preserveElevation: true,
  },
};

/**
 * Infers a physically plausible 3D placement and Medieval Gothic FurnitureType for any custom
 * inventory object not in the hardcoded lookup, using its location description, color, and category.
 * Guarantees every detected object maps to a transformed medieval Gothic 3D asset (never 'generic').
 */
function inferFallbackPlacementFromLocation(
  item: InventoryObjectItem,
  index: number
): SpatialPlacementSpec {
  const loc = (item.location || '').toLowerCase();
  const name = `${item.id || ''} ${item.name || ''}`.toLowerCase();
  const colorLower = (item.color || '').toLowerCase();

  let primaryColor = '#854D0E';
  let secondaryColor = '#C9A24B';
  if (colorLower.includes('red') || colorLower.includes('crimson') || colorLower.includes('burgundy')) primaryColor = '#DC2626';
  else if (colorLower.includes('blue') || colorLower.includes('navy') || colorLower.includes('sapphire')) primaryColor = '#0284C7';
  else if (colorLower.includes('green') || colorLower.includes('emerald')) primaryColor = '#16A34A';
  else if (colorLower.includes('pink') || colorLower.includes('rose')) primaryColor = '#EC4899';
  else if (colorLower.includes('orange') || colorLower.includes('amber')) primaryColor = '#EA580C';
  else if (colorLower.includes('tan') || colorLower.includes('brown')) primaryColor = '#B45309';
  else if (colorLower.includes('black') || colorLower.includes('dark')) primaryColor = '#18181B';
  else if (colorLower.includes('white') || colorLower.includes('clear') || colorLower.includes('silver')) primaryColor = '#E2E8F0';

  let type: FurnitureType = 'cardboard_box_prop'; // Default to Iron-Bound Wooden Chest (never modern or generic)
  if (name.includes('marker') || name.includes('pen') || name.includes('pencil') || name.includes('quill') || name.includes('chalk')) {
    type = 'marker_pen';
  } else if (name.includes('haribo') || name.includes('gumm') || name.includes('candy') || name.includes('sweet') || name.includes('tub') || name.includes('jar') || name.includes('cauldron')) {
    type = 'haribo_tub';
  } else if (name.includes('plate') || name.includes('dish') || name.includes('coaster') || name.includes('tray') || name.includes('disc')) {
    type = 'paper_plates';
  } else if (name.includes('cup') && name.includes('sleeve')) {
    type = 'cups_sleeve';
  } else if (name.includes('coffee') || name.includes('cup') || name.includes('mug') || name.includes('tumbler') || name.includes('goblet') || name.includes('chalice')) {
    type = 'coffee_cup';
  } else if (name.includes('glass') && (name.includes('bottle') || name.includes('carafe') || name.includes('flask'))) {
    type = 'glass_bottle';
  } else if ((name.includes('water') || name.includes('bottle')) && (name.includes('pack') || name.includes('crate') || name.includes('case'))) {
    type = 'water_multipack';
  } else if (name.includes('bottle') || name.includes('flask') || name.includes('thermos') || name.includes('phial') || name.includes('vial')) {
    type = 'water_bottle_small';
  } else if (name.includes('pepsi') || name.includes('coke') || name.includes('cola') || name.includes('soda') || name.includes('can') || name.includes('multipack')) {
    type = 'pepsi_multipack';
  } else if (name.includes('keyboard') || name.includes('laptop') || name.includes('macbook') || name.includes('computer') || name.includes('tablet') || name.includes('ipad')) {
    type = 'keyboard_prop';
  } else if (name.includes('microphone') || name.includes('mic') || name.includes('speaker')) {
    type = 'microphone_prop';
  } else if (name.includes('keychain') || name.includes('key') || name.includes('lanyard') || name.includes('badge')) {
    type = 'keychain_prop';
  } else if (name.includes('wallet') || name.includes('folder') || name.includes('book') || name.includes('notebook') || name.includes('binder') || name.includes('journal') || name.includes('diary')) {
    type = 'grimoire_folio';
  } else if (name.includes('sticky') || name.includes('note') || name.includes('paper') || name.includes('scroll') || name.includes('flyer')) {
    type = 'moss_vellum_slips';
  } else if (name.includes('apple') || name.includes('fruit') || name.includes('orange') || name.includes('banana') || name.includes('food')) {
    type = 'blood_pomegranate';
  } else if (name.includes('gift bag') || name.includes('paper bag') || name.includes('carrier')) {
    type = 'paper_carrier_bag';
  } else if (name.includes('banner') || name.includes('poster') || name.includes('sign')) {
    type = 'rollup_banner';
  } else if (name.includes('backpack') || name.includes('rucksack')) {
    type = 'backpack_prop';
  } else if (name.includes('carton') || name.includes('juice') || name.includes('milk') || name.includes('drink')) {
    type = 'drink_carton';
  } else if (name.includes('tote') || name.includes('shoulder bag') || name.includes('handbag') || name.includes('bag') || name.includes('satchel')) {
    type = 'tote_bag';
  } else if (name.includes('pouch') || name.includes('Case') || name.includes('purse')) {
    type = 'zip_pouch';
  } else if (name.includes('earbud') || name.includes('airpod') || name.includes('headphone') || name.includes('mouse') || name.includes('phone') || name.includes('charger')) {
    type = 'earbuds_case';
  } else if (name.includes('chair') || name.includes('stool') || name.includes('seat')) {
    type = 'chair';
  } else if (name.includes('cardboard') || name.includes('box') || name.includes('crate') || name.includes('bin') || name.includes('container')) {
    type = 'cardboard_box_prop';
  }

  // Supporting surface inference from location string
  if (
    loc.includes('on top of the central av podium') ||
    loc.includes('on the central av podium') ||
    loc.includes('on the podium') ||
    loc.includes('front desk') ||
    loc.includes('lectern') ||
    loc.includes('altar')
  ) {
    const offset = ((index % 7) - 3) * 0.22;
    return {
      type,
      x: 0.95 + offset,
      y: 1.25,
      z: -6.78,
      width: 0.18,
      height: 0.16,
      depth: 0.18,
      rotationY: 0,
      primaryColor,
      secondaryColor,
      supportingSurface: 'central_av_podium (countertop, y=1.25m)',
      preserveElevation: true,
    };
  }

  if (loc.includes('whiteboard') || loc.includes('chalkboard')) {
    const offset = ((index % 4) - 1.5) * 0.35;
    return {
      type,
      x: -2.5 + offset,
      y: 0.82,
      z: -9.85,
      width: 0.18,
      height: 0.06,
      depth: 0.12,
      rotationY: 0,
      primaryColor,
      secondaryColor,
      supportingSurface: 'sliding_whiteboard_system (cursed monolith ledge, y=0.82m)',
      preserveElevation: true,
    };
  }

  if ((loc.includes('desk') || loc.includes('table') || loc.includes('row')) && !loc.includes('in front of') && !loc.includes('under')) {
    const offset = ((index % 5) - 2) * 0.55;
    return {
      type,
      x: 5.48 + offset,
      y: 1.02,
      z: -3.10,
      width: 0.24,
      height: 0.20,
      depth: 0.20,
      rotationY: 0,
      primaryColor,
      secondaryColor,
      supportingSurface: 'tier_1_right_bank_desk (y=1.02m)',
      preserveElevation: true,
    };
  }

  // Floor placement in front of podium
  const floorOffset = ((index % 6) - 2.5) * 0.45;
  return {
    type,
    x: 0.6 + floorOffset,
    y: 0.0,
    z: -6.15,
    width: 0.36,
    height: 0.28,
    depth: 0.30,
    rotationY: 0,
    primaryColor,
    secondaryColor,
    supportingSurface: 'floor_carpet (y=0.00m)',
    preserveElevation: true,
  };
}

interface ParallelWorldCounterpart {
  parallelName: string;
  parallelObjectType: string;
  parallelDescription: string;
  virtualAssetType: string;
}

/**
 * Authoritative Parallel-World Counterpart Mapping (Section 8):
 * Maps each real-world `inventory.json` ID to its Medieval Gothic Haunted Castle
 * display name, parallel object category, virtual 3D asset identifier, and lore description.
 * Crucially, this separates real-world identity (used by Gemini Live for webcam verification)
 * from virtual appearance so real object names are never spoiled in the 3D scene!
 */
export const PARALLEL_WORLD_COUNTERPARTS: Record<string, ParallelWorldCounterpart> = {
  red_whiteboard_marker: {
    parallelName: 'Blood-Stained Crimson Quill & Inkwell',
    parallelObjectType: 'cursed_writing_instrument',
    virtualAssetType: 'gothic_quill',
    parallelDescription:
      'A scarlet-plumed feather quill with a bone-white calamus and brass inkwell, resting flat upon the central ritual altar between the runic stone tablet and the ceremonial mead goblet.',
  },
  haribo_tub_top: {
    parallelName: "Cursed Alchemist's Cauldron",
    parallelObjectType: 'alchemical_cauldron_vessel',
    virtualAssetType: 'gothic_alchemist_cauldron',
    parallelDescription:
      'An upper round alchemical cauldron glazed in sapphire and emerald, brimming with a gelatinous glowing brew and stacked atop a lower bronze vessel on the ritual altar.',
  },
  haribo_Gummies: {
    parallelName: "Cursed Alchemist's Cauldron",
    parallelObjectType: 'alchemical_cauldron_vessel',
    virtualAssetType: 'gothic_alchemist_cauldron',
    parallelDescription:
      'An alchemical cauldron brimming with glowing ruby and emerald elixirs resting upon the ritual altar.',
  },
  paper_plates_stack: {
    parallelName: 'Tower of Ritual Moon Discs',
    parallelObjectType: 'engraved_lunar_discs',
    virtualAssetType: 'gothic_ritual_moon_discs',
    parallelDescription:
      'A ceremonial stack of bone-white engraved lunar stone discs resting beside the twin cauldrons on the ritual altar, supporting a row of obsidian chalices.',
  },
  pepsi_max_multipack: {
    parallelName: 'Sealed Midnight Relic Chest',
    parallelObjectType: 'iron_bound_relic_chest',
    virtualAssetType: 'gothic_iron_relic_coffer',
    parallelDescription:
      'A heavy iron-bound reliquary chest shrouded in midnight black and electric sapphire, crouching on the flagstones at the foot of the ritual altar and sealed with silver ward locks.',
  },
  plastic_cups_sleeve: {
    parallelName: 'Row of Obsidian & Emerald Ritual Chalices',
    parallelObjectType: 'ceremonial_chalice_row',
    virtualAssetType: 'gothic_obsidian_chalices',
    parallelDescription:
      'A horizontal rack of stemmed ceremonial chalices crafted from dark obsidian and emerald enamel resting atop the tower of ritual moon discs.',
  },
  glass_swing_top_bottle: {
    parallelName: 'Stoppered Crystal Elixir Decanter',
    parallelObjectType: 'alchemical_crystal_decanter',
    virtualAssetType: 'gothic_elixir_decanter',
    parallelDescription:
      'A faceted alchemical crystal decanter sealed with crimson wax and a brass wire bail stopper, standing near the serpent speaking horn.',
  },
  pret_coffee_cup: {
    parallelName: 'Jewelled Ceremonial Mead Goblet',
    parallelObjectType: 'ceremonial_mead_goblet',
    virtualAssetType: 'gothic_ceremonial_goblet',
    parallelDescription:
      'A stemmed gilded and burgundy-enamel ceremonial goblet brimming with dark spiced brew on the ritual altar.',
  },
  small_water_bottle_podium: {
    parallelName: 'Ancient Sapphire Potion Flask',
    parallelObjectType: 'crystal_potion_phial',
    virtualAssetType: 'gothic_potion_phial',
    parallelDescription:
      'A bulbous alchemical glass potion flask bound with brass filigree and stoppered with a sapphire-sealed cork on the edge of the ritual altar.',
  },
  podium_keyboard: {
    parallelName: 'Engraved Runic Stone Tablet',
    parallelObjectType: 'runic_control_tablet',
    virtualAssetType: 'gothic_runic_tablet',
    parallelDescription:
      'A chiseled dark-slate and brass runic stone tablet etched with glowing arcane sigils set into the central ritual altar beneath the twin scrying mirrors.',
  },
  gooseneck_microphone: {
    parallelName: 'Coiled Brass Serpent Speaking Horn',
    parallelObjectType: 'brass_speaking_horn',
    virtualAssetType: 'gothic_serpent_horn',
    parallelDescription:
      'A serpentine black-iron and brass speaking horn with a glowing ruby eye mounted on the right side of the ritual altar.',
  },
  water_bottles_multipack: {
    parallelName: 'Rose-Bound Apothecary Crate of Elixir Flasks',
    parallelObjectType: 'apothecary_vial_crate',
    virtualAssetType: 'gothic_elixir_crate',
    parallelDescription:
      'A slatted dark-oak apothecary crate bound in rose-crimson velvet and filled with corked crystal potion flasks on the flagstones in front of the ritual altar.',
  },
  cardboard_box_under_podium: {
    parallelName: 'Iron-Bound Dark-Oak Treasure Chest',
    parallelObjectType: 'wooden_storage_chest',
    virtualAssetType: 'gothic_wooden_chest',
    parallelDescription:
      'A heavy iron-bound dark-oak reliquary chest with wrought-iron straps, rivets, and a brass padlock tucked beneath the left side of the central ritual altar.',
  },
  white_paper_carrier_bag: {
    parallelName: 'Wax-Sealed Ivory Vellum Scroll Coffer',
    parallelObjectType: 'parchment_reliquary_satchel',
    virtualAssetType: 'gothic_parchment_satchel',
    parallelDescription:
      'An ivory vellum reliquary satchel sealed with a crimson wax crest and holding rolled ancient scrolls atop the chest beneath the ritual altar.',
  },
  halloween_rollup_banner: {
    parallelName: 'Heraldic War Standard of the Blood Eclipse',
    parallelObjectType: 'medieval_heraldic_standard',
    virtualAssetType: 'gothic_war_standard',
    parallelDescription:
      'A tall tattered medieval war banner in charred obsidian and harvest amber standing on a wrought-iron pike between the cursed stone monolith and the ritual altar.',
  },
  white_backpack_floor: {
    parallelName: "Pale Leather Pilgrim's Satchel & Scroll Pack",
    parallelObjectType: 'leather_adventurer_satchel',
    virtualAssetType: 'gothic_leather_rucksack',
    parallelDescription:
      'A buckled medieval leather satchel with a strapped parchment scroll resting on the castle flagstones in front of the right-side front-row scriptorium bench.',
  },
  coconut_water_carton: {
    parallelName: 'Cobalt & Ivory Alchemical Amphora',
    parallelObjectType: 'porcelain_apothecary_flask',
    virtualAssetType: 'gothic_apothecary_flask',
    parallelDescription:
      'A twin-handled porcelain alchemical amphora glazed in sapphire and ivory with a gilded conical stopper on the front-row scriptorium bench.',
  },
  tan_backpack_desk: {
    parallelName: "Buckled Tan Leather Adventurer's Satchel",
    parallelObjectType: 'leather_adventurer_satchel',
    virtualAssetType: 'gothic_leather_rucksack',
    parallelDescription:
      'A weathered tan-and-brass buckled medieval leather satchel with a rolled map scroll resting on the right end of the front-row scriptorium bench.',
  },
  navy_tote_bag: {
    parallelName: "Midnight-Blue Leather Scholar's Satchel",
    parallelObjectType: 'scholar_leather_satchel',
    virtualAssetType: 'gothic_scholar_satchel',
    parallelDescription:
      'A deep navy-leather scribe satchel with brown harness straps and brass buckles resting on the left end of the right-side front-row scriptorium bench.',
  },
  pink_pouch: {
    parallelName: 'Drawstring Rose-Velvet Alchemical Coin Purse',
    parallelObjectType: 'velvet_alchemical_pouch',
    virtualAssetType: 'gothic_velvet_pouch',
    parallelDescription:
      'A gathered rose-velvet drawstring coin & herb pouch tied with a gold cord resting beside the scholar’s satchel on the front-row scriptorium bench.',
  },
  earbuds_charging_case: {
    parallelName: 'Obsidian Soul-Stone Reliquary Amulet',
    parallelObjectType: 'obsidian_soul_locket',
    virtualAssetType: 'gothic_obsidian_locket',
    parallelDescription:
      'An octagonal polished obsidian reliquary amulet box with a glowing emerald soul-gem resting on the front-row scriptorium bench.',
  },
  orange_chair: {
    parallelName: "Crimson-Amber Velvet Inquisitor's Throne Chair",
    parallelObjectType: 'carved_medieval_chair',
    virtualAssetType: 'gothic_carved_chair',
    parallelDescription:
      'A high-backed carved dark-oak and burnt-amber velvet throne chair stationed behind the ritual altar near the cursed stone monolith.',
  },
  colourful_keychain: {
    parallelName: "Sanctum Keymaster's Wrought-Iron Ring of Keys",
    parallelObjectType: 'medieval_key_ring',
    virtualAssetType: 'gothic_keychain_ring',
    parallelDescription:
      'A forged brass and wrought-iron keymaster ring holding ornate skeleton keys and enamel talisman tags on the ritual altar.',
  },
  black_wallet: {
    parallelName: 'Shadowbound Leather Clasp Grimoire',
    parallelObjectType: 'leather_bound_codex_folio',
    virtualAssetType: 'gothic_grimoire_folio',
    parallelDescription:
      'A dark obsidian-leather pocket grimoire bound with tarnished brass clasps resting on the scriptorium bench.',
  },
  // Mock / Broken-Game Classroom Counterparts
  red_apple: {
    parallelName: 'Blood-Ruby Cursed Pomegranate Chalice',
    parallelObjectType: 'cursed_blood_fruit',
    virtualAssetType: 'gothic_blood_pomegranate',
    parallelDescription:
      'A forbidden blood-crimson pomegranate crowned in tarnished gold and resting upon a ritual tazza dish on the right side of the front altar.',
  },
  green_sticky_notes: {
    parallelName: 'Moss-Inscribed Vellum Rune Slips',
    parallelObjectType: 'illuminated_vellum_runes',
    virtualAssetType: 'gothic_moss_vellum_slips',
    parallelDescription:
      'Small square slips of moss-green vellum pinned with golden wax seals beneath the cursed inscription monolith.',
  },
  blue_marker: {
    parallelName: 'Drowned-Sky Sapphire Quill & Inkwell',
    parallelObjectType: 'cursed_writing_instrument',
    virtualAssetType: 'gothic_quill',
    parallelDescription:
      'An ancient sapphire-plumed feather quill dipped in ink the colour of a drowned sky, resting on the inscription monolith ledge.',
  },
  orange_folder: {
    parallelName: 'Amber Leather Grimoire Folio',
    parallelObjectType: 'leather_bound_codex_folio',
    virtualAssetType: 'gothic_grimoire_folio',
    parallelDescription:
      'A harvest-amber leather folio bound with brass corner clasps, hiding final parchment scrolls near the stained-glass lancet window.',
  },
  red_folder: {
    parallelName: 'Crimson Seal Codex Folio',
    parallelObjectType: 'leather_bound_codex_folio',
    virtualAssetType: 'gothic_grimoire_folio',
    parallelDescription:
      'A blood-crimson leather codex folio sealed with a golden medallion near the sanctuary exit.',
  },
};

const TYPE_TO_PARALLEL_ARCHETYPE: Partial<Record<FurnitureType, { title: string; objType: string; asset: string }>> = {
  marker_pen: { title: 'Blood-Stained Feather Quill & Brass Inkwell', objType: 'cursed_writing_instrument', asset: 'gothic_quill' },
  haribo_tub: { title: "Cursed Alchemist's Cauldron", objType: 'alchemical_cauldron_vessel', asset: 'gothic_alchemist_cauldron' },
  paper_plates: { title: 'Tower of Ritual Moon Discs', objType: 'engraved_lunar_discs', asset: 'gothic_ritual_moon_discs' },
  cups_sleeve: { title: 'Row of Obsidian & Emerald Ritual Chalices', objType: 'ceremonial_chalice_row', asset: 'gothic_obsidian_chalices' },
  glass_bottle: { title: 'Stoppered Crystal Elixir Decanter', objType: 'alchemical_crystal_decanter', asset: 'gothic_elixir_decanter' },
  coffee_cup: { title: 'Jewelled Ceremonial Goblet', objType: 'ceremonial_mead_goblet', asset: 'gothic_ceremonial_goblet' },
  water_bottle_small: { title: 'Ancient Alchemical Potion Flask', objType: 'crystal_potion_phial', asset: 'gothic_potion_phial' },
  keyboard_prop: { title: 'Engraved Runic Stone Tablet', objType: 'runic_control_tablet', asset: 'gothic_runic_tablet' },
  microphone_prop: { title: 'Coiled Brass Serpent Speaking Horn', objType: 'brass_speaking_horn', asset: 'gothic_serpent_horn' },
  pepsi_multipack: { title: 'Sealed Iron-Bound Relic Chest', objType: 'iron_bound_relic_chest', asset: 'gothic_iron_relic_coffer' },
  water_multipack: { title: 'Apothecary Crate of Crystal Potion Flasks', objType: 'apothecary_vial_crate', asset: 'gothic_elixir_crate' },
  cardboard_box_prop: { title: 'Iron-Bound Dark-Oak Treasure Chest', objType: 'wooden_storage_chest', asset: 'gothic_wooden_chest' },
  paper_carrier_bag: { title: 'Wax-Sealed Vellum Scroll Coffer', objType: 'parchment_reliquary_satchel', asset: 'gothic_parchment_satchel' },
  rollup_banner: { title: 'Tattered Medieval Heraldic War Standard', objType: 'medieval_heraldic_standard', asset: 'gothic_war_standard' },
  backpack_prop: { title: "Buckled Medieval Leather Pilgrim's Satchel", objType: 'leather_adventurer_satchel', asset: 'gothic_leather_rucksack' },
  drink_carton: { title: 'Glazed Porcelain Alchemical Amphora', objType: 'porcelain_apothecary_flask', asset: 'gothic_apothecary_flask' },
  tote_bag: { title: "Buckled Leather Scholar's Satchel", objType: 'scholar_leather_satchel', asset: 'gothic_scholar_satchel' },
  zip_pouch: { title: 'Drawstring Velvet Alchemical Coin Purse', objType: 'velvet_alchemical_pouch', asset: 'gothic_velvet_pouch' },
  earbuds_case: { title: 'Obsidian Soul-Stone Reliquary Amulet', objType: 'obsidian_soul_locket', asset: 'gothic_obsidian_locket' },
  blood_pomegranate: { title: 'Blood-Ruby Cursed Pomegranate Tazza', objType: 'cursed_blood_fruit', asset: 'gothic_blood_pomegranate' },
  moss_vellum_slips: { title: 'Moss-Inscribed Vellum Rune Slips', objType: 'illuminated_vellum_runes', asset: 'gothic_moss_vellum_slips' },
  grimoire_folio: { title: 'Leather-Bound Medieval Grimoire Folio', objType: 'leather_bound_codex_folio', asset: 'gothic_grimoire_folio' },
  keychain_prop: { title: "Sanctum Keymaster's Wrought-Iron Ring of Keys", objType: 'medieval_key_ring', asset: 'gothic_keychain_ring' },
  chair: { title: "Carved Dark-Oak Inquisitor's Throne Chair", objType: 'carved_medieval_chair', asset: 'gothic_carved_chair' },
};

function inferParallelCounterpart(item: InventoryObjectItem, specType: FurnitureType): ParallelWorldCounterpart {
  const known = PARALLEL_WORLD_COUNTERPARTS[item.id];
  if (known) return known;

  const archetype = TYPE_TO_PARALLEL_ARCHETYPE[specType] || {
    title: 'Iron-Bound Dark-Oak Reliquary Chest',
    objType: `cursed_${specType}`,
    asset: `gothic_${specType}`,
  };

  return {
    parallelName: `${archetype.title} (${item.color})`,
    parallelObjectType: archetype.objType,
    virtualAssetType: archetype.asset,
    parallelDescription: `An ancient medieval Gothic parallel-world counterpart (${item.color}) resting ${item.location}.`,
  };
}

/**
 * Builds the complete derived Parallel Object Mapping table (Section 8)
 * for all objects in `inventoryData.objects`.
 */
export function buildParallelObjectMappings(
  inventoryData: InventoryData,
  gameData: EscapeGameData,
  solvedTargetIds: Set<string> = new Set()
): ParallelObjectMapping[] {
  const puzzleMap = new Map<string, EscapePuzzleItem>();
  (gameData.puzzles || []).forEach((p) => {
    if (p.target) puzzleMap.set(p.target, p);
  });

  return (inventoryData.objects || []).map((item, idx) => {
    const spec =
      AUTHORITATIVE_SPATIAL_SPECS[item.id] || inferFallbackPlacementFromLocation(item, idx);
    const counterpart = inferParallelCounterpart(item, spec.type);
    const matchedPuzzle = puzzleMap.get(item.id);

    return {
      realObjectId: item.id,
      realName: item.name,
      parallelName: counterpart.parallelName,
      parallelObjectType: counterpart.parallelObjectType,
      parallelDescription: counterpart.parallelDescription,
      virtualAssetType: counterpart.virtualAssetType,
      anchorLocation: item.location,
      supportingSurface: spec.supportingSurface,
      position: { x: spec.x, y: spec.y, z: spec.z },
      rotation: { x: 0, y: spec.rotationY, z: 0 },
      scale: { x: spec.width, y: spec.height, z: spec.depth },
      isPuzzleTarget: Boolean(matchedPuzzle),
      puzzleId: matchedPuzzle?.id,
      rewardDigit: matchedPuzzle?.reward_digit,
      resolvedState: solvedTargetIds.has(item.id),
    };
  });
}

/**
 * Converts an authoritative `InventoryObjectItem` + optional `EscapePuzzleItem` into a `SceneObject`.
 * Uses the Medieval Gothic Parallel-World display name & description so the real-world object name
 * is never spoiled prior to camera verification!
 */
export function buildSceneObjectFromInventoryItem(
  item: InventoryObjectItem,
  puzzleMap: Map<string, EscapePuzzleItem>,
  index = 0
): SceneObject {
  const spec =
    AUTHORITATIVE_SPATIAL_SPECS[item.id] || inferFallbackPlacementFromLocation(item, index);
  const matchedPuzzle = puzzleMap.get(item.id);
  const isInteractive = Boolean(matchedPuzzle) || Boolean(item.portable);
  const counterpart = inferParallelCounterpart(item, spec.type);

  return {
    id: item.id,
    name: counterpart.parallelName,
    type: spec.type,
    x: spec.x,
    y: spec.y,
    z: spec.z,
    width: spec.width,
    height: spec.height,
    depth: spec.depth,
    rotationY: spec.rotationY,
    primaryColor: spec.primaryColor,
    secondaryColor: spec.secondaryColor,
    description: counterpart.parallelDescription,
    interactive: isInteractive,
    puzzleId: matchedPuzzle?.id,
    rewardDigit: matchedPuzzle?.reward_digit,
    clue: matchedPuzzle?.clue,
    locationText: item.location,
    supportingSurface: spec.supportingSurface,
    preserveElevation: spec.preserveElevation,
    isInventoryProp: true,
    photoIndex: item.image_ref?.photo_index,
    box2d: item.image_ref?.box_2d,
    parallelObjectType: counterpart.parallelObjectType,
    virtualAssetType: counterpart.virtualAssetType,
  };
}

/**
 * Integrates `inventory.json` and `game.json` into a `RoomEnvironmentData` scene blueprint.
 * - Matches objects strictly by exact `id`.
 * - Deduplicates any overlapping legacy object IDs so there is only 1 entity per ID.
 * - Preserves all 21 inventory objects and guarantees every valid puzzle target is present.
 */
export function integrateInventoryAndGameIntoRoom(
  roomData: RoomEnvironmentData,
  inventoryData: InventoryData = DEFAULT_INVENTORY_DATA,
  gameData: EscapeGameData = DEFAULT_GAME_DATA
): RoomEnvironmentData {
  const puzzleByTargetId = new Map<string, EscapePuzzleItem>();
  (gameData.puzzles || []).forEach((p) => {
    if (p.target) {
      puzzleByTargetId.set(p.target, p);
    }
  });

  // Remove legacy duplicate IDs that were replaced by authoritative inventory IDs
  const legacyReplacedIds = new Set([
    'halloween_deepmind_banner', // replaced by `halloween_rollup_banner`
    'presenter_orange_chair',    // replaced by `orange_chair`
    'catering_beverage_packs',   // replaced by `pepsi_max_multipack` & `water_bottles_multipack`
  ]);

  const inventoryIdSet = new Set((inventoryData.objects || []).map((o) => o.id));

  // Keep architectural & furniture objects that are not duplicated by inventoryIdSet
  const baseObjects: SceneObject[] = [];
  const seenIds = new Set<string>();

  for (const obj of roomData.objects || []) {
    if (legacyReplacedIds.has(obj.id)) continue;
    if (inventoryIdSet.has(obj.id)) continue;
    if (seenIds.has(obj.id)) continue;
    seenIds.add(obj.id);
    baseObjects.push(obj);
  }

  // Build authoritative SceneObjects for every object in inventory.objects
  const inventorySceneObjects: SceneObject[] = [];
  (inventoryData.objects || []).forEach((item, idx) => {
    if (seenIds.has(item.id)) return; // Prevent duplicates
    seenIds.add(item.id);
    inventorySceneObjects.push(buildSceneObjectFromInventoryItem(item, puzzleByTargetId, idx));
  });

  return {
    ...roomData,
    objects: [...baseObjects, ...inventorySceneObjects],
  };
}

/**
 * Validates the live Three.js scene graph against `inventory.json` and `game.json`
 * according to the 6 mandatory validation rules + parallel-world 3D geometry checks.
 */
export function validateSceneGraph(
  roomGroup: THREE.Group,
  roomData: RoomEnvironmentData,
  inventoryData: InventoryData,
  gameData: EscapeGameData,
  registry: Map<string, SceneRegistryEntry>,
  fallbackInstantiatedIds: Set<string>
): SceneValidationReport {
  const inventoryMap = new Map<string, InventoryObjectItem>();
  (inventoryData.objects || []).forEach((item) => {
    inventoryMap.set(item.id, item);
  });

  // Count occurrences of each object ID in the actual Three.js roomGroup
  const sceneIdCounts = new Map<string, number>();
  const sceneObjectsById = new Map<string, THREE.Object3D>();

  roomGroup.children.forEach((child) => {
    const cid = child.userData?.id;
    if (typeof cid === 'string' && cid.length > 0) {
      sceneIdCounts.set(cid, (sceneIdCounts.get(cid) || 0) + 1);
      if (!sceneObjectsById.has(cid)) {
        sceneObjectsById.set(cid, child);
      }
    }
  });

  const duplicateIds: string[] = [];
  sceneIdCounts.forEach((count, id) => {
    if (count > 1) duplicateIds.push(id);
  });

  const missingInventoryTargets: string[] = [];
  const puzzleResults: PuzzleObjectValidationResult[] = [];

  const halfW = (roomData.roomWidth || 16.0) / 2;
  const halfL = (roomData.roomLength || 22.0) / 2;
  const maxH = roomData.roomHeight || 6.2;

  for (const puzzle of gameData.puzzles || []) {
    const targetId = puzzle.target;
    const invItem = inventoryMap.get(targetId);
    const errorMessages: string[] = [];

    // Check 1: Every game.puzzles[].target exists in inventory.objects
    const inInventory = Boolean(invItem);
    if (!inInventory) {
      missingInventoryTargets.push(targetId);
      errorMessages.push(
        `Target ID "${targetId}" referenced by puzzle "${puzzle.id}" does NOT exist in inventory.objects.`
      );
    }

    // Check 2: Every required object has a corresponding entity in the actual Three.js scene
    const regEntry = registry.get(targetId);
    const threeObj = sceneObjectsById.get(targetId) || regEntry?.sceneObject || null;
    const inSceneGraph = Boolean(threeObj && threeObj.parent === roomGroup);
    if (!inSceneGraph) {
      errorMessages.push(`Target "${targetId}" has no mounted THREE.Object3D in the scene graph.`);
    }

    // Check 3: Required objects have valid transforms and non-empty visible geometry
    let meshCount = 0;
    let vertexCount = 0;
    let hasValidTransform = false;

    if (threeObj) {
      const pos = threeObj.position;
      hasValidTransform =
        Number.isFinite(pos.x) &&
        Number.isFinite(pos.y) &&
        Number.isFinite(pos.z) &&
        threeObj.visible;

      threeObj.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry instanceof THREE.BufferGeometry && mesh.visible) {
          const posAttr = mesh.geometry.getAttribute('position');
          if (posAttr && posAttr.count > 0) {
            meshCount += 1;
            vertexCount += posAttr.count;
          }
        }
      });
    }

    const hasValidTransformAndGeometry = hasValidTransform && meshCount > 0 && vertexCount > 0;
    if (!hasValidTransformAndGeometry && inSceneGraph) {
      errorMessages.push(
        `Target "${targetId}" has invalid transform or empty geometry (meshes=${meshCount}, vertices=${vertexCount}).`
      );
    }

    // Check 4: Required objects are positioned on plausible supporting surfaces
    const pos = threeObj
      ? {
          x: Math.round(threeObj.position.x * 100) / 100,
          y: Math.round(threeObj.position.y * 100) / 100,
          z: Math.round(threeObj.position.z * 100) / 100,
        }
      : null;

    const supportingSurface =
      regEntry?.supportingSurface ||
      (threeObj?.userData?.supportingSurface as string) ||
      'unassigned';

    const onSupportingSurface = Boolean(
      pos &&
        pos.y >= -0.01 &&
        pos.y <= maxH - 0.1 &&
        supportingSurface &&
        supportingSurface !== 'unassigned'
    );
    if (!onSupportingSurface && inSceneGraph) {
      errorMessages.push(`Target "${targetId}" is not resting on a valid supporting surface.`);
    }

    // Check 5: Required objects are not completely obscured or placed outside navigable room
    const withinNavigableBounds = Boolean(
      pos &&
        Math.abs(pos.x) <= halfW - 0.1 &&
        Math.abs(pos.z) <= halfL - 0.1 &&
        pos.y >= -0.01 &&
        pos.y <= maxH - 0.1
    );
    if (!withinNavigableBounds && inSceneGraph) {
      errorMessages.push(`Target "${targetId}" is outside the navigable room boundaries.`);
    }

    // Check 6: Multiple detections of the same object do not produce duplicate meshes
    const instanceCount = sceneIdCounts.get(targetId) || 0;
    const noDuplicates = instanceCount === 1;
    if (instanceCount > 1) {
      errorMessages.push(
        `Duplicate Three.js entities detected for ID "${targetId}" (count=${instanceCount}).`
      );
    }

    const counterpartInfo =
      PARALLEL_WORLD_COUNTERPARTS[targetId] ||
      (invItem
        ? inferParallelCounterpart(
            invItem,
            (AUTHORITATIVE_SPATIAL_SPECS[targetId] || inferFallbackPlacementFromLocation(invItem, 0)).type
          )
        : undefined);
    const hasParallelMapping = Boolean(counterpartInfo || threeObj?.userData?.hasParallelMapping);
    const virtualAssetType =
      (threeObj?.userData?.virtualAssetType as string) ||
      counterpartInfo?.virtualAssetType ||
      (threeObj?.userData?.type ? `gothic_${threeObj.userData.type}` : 'gothic_relic');
    const usesMedievalAsset =
      Boolean(threeObj?.userData?.isMedievalGothicAsset) &&
      Boolean(virtualAssetType) &&
      !virtualAssetType.includes('modern') &&
      meshCount >= 3;

    if (!usesMedievalAsset && inSceneGraph) {
      errorMessages.push(
        `Target "${targetId}" has not been transformed into a multi-part Medieval Gothic 3D asset.`
      );
    }

    const fallbackInstantiated = fallbackInstantiatedIds.has(targetId);
    const allChecksPassed =
      inInventory &&
      inSceneGraph &&
      hasValidTransformAndGeometry &&
      onSupportingSurface &&
      withinNavigableBounds &&
      noDuplicates &&
      hasParallelMapping &&
      usesMedievalAsset;

    let status: PuzzleObjectValidationResult['status'] = 'valid';
    if (!inInventory) {
      status = 'missing_from_inventory';
    } else if (!allChecksPassed) {
      status = 'invalid';
    } else if (fallbackInstantiated) {
      status = 'fallback_recovered';
    }

    puzzleResults.push({
      puzzleId: puzzle.id,
      targetId,
      objectName: invItem?.name || regEntry?.name || 'Unresolved Object',
      parallelName: counterpartInfo?.parallelName || regEntry?.name || 'Cursed Relic',
      virtualAssetType,
      hasParallelMapping,
      usesMedievalAsset,
      rewardDigit: puzzle.reward_digit,
      clue: puzzle.clue,
      location: invItem?.location || regEntry?.location || 'Missing from inventory',
      supportingSurface,
      position: pos,
      inInventory,
      inSceneGraph,
      hasValidTransformAndGeometry,
      onSupportingSurface,
      withinNavigableBounds,
      noDuplicates,
      meshCount,
      vertexCount,
      fallbackInstantiated,
      status,
      errorMessages,
    });
  }

  const allPuzzlesValid =
    puzzleResults.length > 0 &&
    puzzleResults.every((r) => r.status === 'valid' || r.status === 'fallback_recovered');

  return {
    timestamp: Date.now(),
    gameTitle: gameData.title || 'Escape Room Scene',
    finalCode: gameData.final_code || '',
    totalInventoryObjects: (inventoryData.objects || []).length,
    registeredSceneObjects: registry.size,
    mandatoryPuzzleCount: (gameData.puzzles || []).length,
    allPuzzlesValid,
    missingInventoryTargets,
    duplicateIds,
    puzzleResults,
  };
}
