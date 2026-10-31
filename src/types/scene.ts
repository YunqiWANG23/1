export type FurnitureType =
  | 'sofa'
  | 'couch'
  | 'bed'
  | 'desk'
  | 'table'
  | 'chair'
  | 'armchair'
  | 'throne'
  | 'lecture_row'
  | 'av_console'
  | 'projection_screen'
  | 'whiteboard'
  | 'rollup_banner'
  | 'catering_table'
  | 'beverage_crates'
  | 'double_door'
  | 'bookshelf'
  | 'wardrobe'
  | 'cabinet'
  | 'tv_stand'
  | 'coffee_table'
  | 'nightstand'
  | 'plant'
  | 'floor_lamp'
  | 'lamp'
  | 'rug'
  | 'wall_art'
  | 'banner'
  | 'window'
  | 'door'
  | 'pillar'
  | 'chandelier'
  | 'podium'
  | 'brazier'
  | 'fireplace'
  | 'piano'
  | 'armor'
  | 'statue'
  | 'clock'
  | 'chest'
  | 'marker_pen'
  | 'haribo_tub'
  | 'paper_plates'
  | 'cups_sleeve'
  | 'glass_bottle'
  | 'coffee_cup'
  | 'water_bottle_small'
  | 'keyboard_prop'
  | 'microphone_prop'
  | 'pepsi_multipack'
  | 'water_multipack'
  | 'cardboard_box_prop'
  | 'paper_carrier_bag'
  | 'backpack_prop'
  | 'drink_carton'
  | 'tote_bag'
  | 'zip_pouch'
  | 'earbuds_case'
  | 'blood_pomegranate'
  | 'moss_vellum_slips'
  | 'grimoire_folio'
  | 'keychain_prop'
  | 'generic';

export interface InventoryImageRef {
  photo_index: number;
  box_2d: [number, number, number, number];
}

export interface InventoryObjectItem {
  id: string;
  name: string;
  color: string;
  location: string;
  portable: boolean;
  camera_distinct: number;
  owner: string;
  safe: boolean;
  image_ref?: InventoryImageRef;
}

export interface InventoryData {
  room_summary: string;
  landmarks: string[];
  objects: InventoryObjectItem[];
}

export interface EscapePuzzleItem {
  id: string;
  clue: string;
  solve_by: string;
  target: string;
  reward_digit: string;
  hints: string[];
  why_it_works?: string;
  clueAnchorId?: string;
}

export interface EscapeGameData {
  title: string;
  intro: string;
  puzzles: EscapePuzzleItem[];
  final_code: string;
  outro: string;
}

/**
 * Derived Parallel-World Object Mapping (Section 8):
 * Separates real-world object identity (used by Gemini Live for webcam verification)
 * from virtual Medieval Gothic Haunted Castle appearance in the 3D scene.
 */
export interface ParallelObjectMapping {
  realObjectId: string;
  realName: string;
  parallelName: string;
  parallelObjectType: string;
  parallelDescription: string;
  virtualAssetType: string;
  anchorLocation: string;
  supportingSurface: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  isPuzzleTarget: boolean;
  puzzleId?: string;
  rewardDigit?: string;
  resolvedState: boolean;
}

export type VerificationVerdict = 'match' | 'no_match' | 'uncertain';

export interface GeminiVerificationResult {
  verdict: VerificationVerdict;
  confidence: number;
  observedObject: string;
  explanation: string;
}

export interface SolvedPuzzleRecord {
  puzzleId: string;
  rewardDigit: string;
  solvedAt: number;
  explanation?: string;
}

export interface ProximityInteractionTarget {
  type: 'puzzle_clue' | 'exit_door';
  anchorId: string;
  anchorName: string;
  anchorTitle?: string;
  anchorArchetype?: 'spellbook' | 'recipe_scroll' | 'runic_inscription' | 'torn_letter';
  directionalObjective?: string;
  spatialReasoningHint?: string;
  puzzleId?: string;
  puzzleIndex?: number;
  distance: number;
  position: { x: number; y: number; z: number };
}

export interface EscapeGameState {
  activePuzzleId: string | null;
  isCameraVerifyOpen: boolean;
  isExitDoorModalOpen: boolean;
  isIntroOpen: boolean;
  solvedPuzzles: Record<string, SolvedPuzzleRecord>;
  revealedHints: Record<string, number>;
  isDoorUnlocked: boolean;
  isDoorOpen: boolean;
  isGameWon: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  type: FurnitureType;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationY: number; // in degrees
  primaryColor: string;
  secondaryColor?: string;
  description?: string;
  seatCount?: number;
  // Escape-room & Parallel-World integration metadata
  interactive?: boolean;
  puzzleId?: string;
  rewardDigit?: string;
  clue?: string;
  locationText?: string;
  supportingSurface?: string;
  preserveElevation?: boolean;
  isInventoryProp?: boolean;
  photoIndex?: number;
  box2d?: [number, number, number, number];
  parallelObjectType?: string;
  virtualAssetType?: string;
}

export interface PuzzleObjectValidationResult {
  puzzleId: string;
  targetId: string;
  objectName: string;
  parallelName?: string;
  virtualAssetType?: string;
  hasParallelMapping?: boolean;
  usesMedievalAsset?: boolean;
  rewardDigit: string;
  clue: string;
  location: string;
  supportingSurface: string;
  position: { x: number; y: number; z: number } | null;
  inInventory: boolean;
  inSceneGraph: boolean;
  hasValidTransformAndGeometry: boolean;
  onSupportingSurface: boolean;
  withinNavigableBounds: boolean;
  noDuplicates: boolean;
  meshCount: number;
  vertexCount: number;
  fallbackInstantiated: boolean;
  status: 'valid' | 'fallback_recovered' | 'missing_from_inventory' | 'invalid';
  errorMessages: string[];
}

export interface SceneValidationReport {
  timestamp: number;
  gameTitle: string;
  finalCode: string;
  totalInventoryObjects: number;
  registeredSceneObjects: number;
  mandatoryPuzzleCount: number;
  allPuzzlesValid: boolean;
  missingInventoryTargets: string[];
  duplicateIds: string[];
  puzzleResults: PuzzleObjectValidationResult[];
}

export interface TieredFloorConfig {
  enabled: boolean;
  startZ: number;      // Z coordinate where first step riser begins (e.g., -4.0)
  endZ: number;        // Z coordinate where top tier ends (e.g., 10.5)
  numTiers: number;    // Number of stepped platform rows (e.g., 10)
  stepHeight: number;  // Height rise per tier in meters (e.g., 0.28)
  aisleXPositions?: number[]; // X coordinates of stepped stair aisles with silver nosing
}

export interface RoomEnvironmentData {
  roomType: string;
  roomWidth: number;
  roomLength: number;
  roomHeight: number;
  wallColor: string;
  floorType: 'hardwood' | 'tiles' | 'carpet' | 'concrete' | string;
  floorColor: string;
  ceilingColor: string;
  lightingMood: 'warm_cozy' | 'daylight_bright' | 'evening_ambient' | 'golden_hour' | string;
  lightIntensity: number;
  keyLightColor: string;
  ambientLightColor: string;
  architecturalNotes: string;
  tieredFloor?: TieredFloorConfig;
  suggestedSpawnPoint: {
    x: number;
    z: number;
  };
  objects: SceneObject[];
}

export type CameraViewMode = 'third_person' | 'first_person' | 'dollhouse' | 'top_down';

export interface CharacterControlKeys {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
}

export interface CollisionBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  name: string;
  isTrigger?: boolean;
}

export interface SampleRoomPreset {
  id: string;
  title: string;
  tagline: string;
  thumbnail: string;
  referencePhotos?: string[];
  roomData: RoomEnvironmentData;
}



