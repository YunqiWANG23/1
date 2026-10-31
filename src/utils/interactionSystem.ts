import {
  EscapeGameData,
  EscapePuzzleItem,
  ProximityInteractionTarget,
  RoomEnvironmentData,
} from '../types/scene';
import { SceneRegistryEntry } from './escapeRoomData';

export type ClueAnchorArchetype =
  | 'spellbook'
  | 'recipe_scroll'
  | 'runic_inscription'
  | 'torn_letter';

export interface ResolvedClueAnchor {
  puzzleId: string;
  puzzleIndex: number;
  clueAnchorId: string;
  anchorName: string;
  anchorTitle: string;
  anchorArchetype: ClueAnchorArchetype;
  directionalObjective: string;
  spatialReasoningHint: string;
  position: { x: number; y: number; z: number };
  dimensions: { width: number; height: number; depth: number };
}

/**
 * Default landmark anchor mapping for the riddles so each puzzle has a distinct,
 * physically accessible investigation point in the 3D lecture theatre WITHOUT
 * revealing or highlighting the secret `target` object prior to solving.
 */
const DEFAULT_CLUE_ANCHOR_PREFERENCES: Record<string, string[]> = {
  p1: ['sliding_whiteboard_system', 'tier_1_left_bank', 'stainless_av_console'],
  p2: ['stainless_av_console', 'orange_chair', 'tier_1_center_bank'],
  p3: ['presenter_side_table', 'tier_1_right_bank', 'stainless_av_console'],
  p4: ['halloween_rollup_banner', 'orange_chair', 'tier_1_left_bank'],
};

const FALLBACK_LANDMARK_IDS = [
  'sliding_whiteboard_system',
  'stainless_av_console',
  'presenter_side_table',
  'halloween_rollup_banner',
  'orange_chair',
  'tier_1_right_bank',
  'tier_1_center_bank',
  'tier_1_left_bank',
];

const ARCHETYPE_SEQUENCE: ClueAnchorArchetype[] = [
  'spellbook',
  'recipe_scroll',
  'torn_letter',
  'runic_inscription',
];

interface LandmarkNarrativeSpec {
  anchorTitle: string;
  anchorArchetype: ClueAnchorArchetype;
  directionalObjective: string;
  spatialReasoningHint: string;
}

const LANDMARK_NARRATIVE_SPECS: Record<string, LandmarkNarrativeSpec> = {
  sliding_whiteboard_system: {
    anchorTitle: 'Ancient Spellbook at the Obsidian Inscription Wall',
    anchorArchetype: 'spellbook',
    directionalObjective:
      'Walk to the West Sanctum Wall (left of the altar) and inspect the Ancient Spellbook resting by the Obsidian Inscription Slabs.',
    spatialReasoningHint:
      'Parallel-World Link: You discovered this clue at the Obsidian Inscription Wall on the left side of the castle — corresponding to the real-world Sliding Whiteboard wall & marker tray.',
  },
  stainless_av_console: {
    anchorTitle: "Alchemist's Recipe Scroll on the Cursed Ritual Lectern",
    anchorArchetype: 'recipe_scroll',
    directionalObjective:
      'Approach the central Cursed Stone Ritual Lectern at the front of the hall and examine the Alchemist’s Recipe Scroll.',
    spatialReasoningHint:
      'Parallel-World Link: You uncovered this scroll atop the central Cursed Ritual Lectern — corresponding to the real-world Stainless-Steel AV Podium in the front-center of the room.',
  },
  presenter_side_table: {
    anchorTitle: 'Torn Parchment Letter on the Preparation Side Table',
    anchorArchetype: 'torn_letter',
    directionalObjective:
      'Explore the area just left of the central lectern and inspect the Torn Parchment Letter sealed on the Carved Preparation Table.',
    spatialReasoningHint:
      'Parallel-World Link: This torn parchment was left on the Carved Preparation Table beside the main altar — corresponding to the real-world Presenter Side Table & Podium surface.',
  },
  halloween_rollup_banner: {
    anchorTitle: 'Runic Inscription Tablet by the Heraldic War Standard',
    anchorArchetype: 'runic_inscription',
    directionalObjective:
      'Walk toward the freestanding Tattered Heraldic War Standard on the left front floor and read the Runic Inscription Tablet at its base.',
    spatialReasoningHint:
      'Parallel-World Link: This runic tablet stands beside the Tattered Heraldic War Standard near the front-left floor — corresponding to the area between the real-world Roll-Up Banner and the AV Podium.',
  },
  orange_chair: {
    anchorTitle: 'Sealed Chronicle on the Crimson Velvet Inquisitor Throne',
    anchorArchetype: 'torn_letter',
    directionalObjective:
      'Move behind the central lectern and inspect the Sealed Chronicle resting on the Crimson Velvet Inquisitor Throne.',
    spatialReasoningHint:
      'Parallel-World Link: Located at the Crimson Velvet Throne behind the lectern — corresponding to the real-world Presenter Chair behind the AV Podium.',
  },
  tier_1_left_bank: {
    anchorTitle: 'Illuminated Grimoire on the Front-Left Choir Stall',
    anchorArchetype: 'spellbook',
    directionalObjective:
      'Step up to the first row of Gothic Choir Stalls on the left flank and inspect the Illuminated Grimoire.',
    spatialReasoningHint:
      'Parallel-World Link: Found on the front-left Gothic Choir Stall — corresponding to the front-left tiered seating row in the real room.',
  },
  tier_1_center_bank: {
    anchorTitle: 'Alchemical Parchment on the Front-Center Choir Stall',
    anchorArchetype: 'recipe_scroll',
    directionalObjective:
      'Walk to the front-center row of Gothic Choir Stalls facing the altar and inspect the Alchemical Parchment.',
    spatialReasoningHint:
      'Parallel-World Link: Found on the front-center Gothic Choir Stall — corresponding to the front-center tiered desks facing the podium.',
  },
  tier_1_right_bank: {
    anchorTitle: 'Runic Tablet on the Front-Right Choir Stall',
    anchorArchetype: 'runic_inscription',
    directionalObjective:
      'Head to the front-right Gothic Choir Stalls near the eastern aisle and inspect the carved Runic Tablet.',
    spatialReasoningHint:
      'Parallel-World Link: Found on the front-right Gothic Choir Stall — corresponding to the front-right tiered seating row in the real room.',
  },
};

function buildFallbackNarrativeSpec(
  entry: SceneRegistryEntry,
  puzzleIndex: number
): LandmarkNarrativeSpec {
  const archetype = ARCHETYPE_SEQUENCE[puzzleIndex % ARCHETYPE_SEQUENCE.length];
  const labelMap: Record<ClueAnchorArchetype, string> = {
    spellbook: 'Ancient Spellbook',
    recipe_scroll: "Alchemist's Recipe Scroll",
    torn_letter: 'Torn Parchment Letter',
    runic_inscription: 'Runic Inscription Tablet',
  };
  const artifactLabel = labelMap[archetype];
  const zoneDesc =
    entry.position.x < -2.2
      ? 'along the western side of the chamber'
      : entry.position.x > 2.2
      ? 'along the eastern side of the chamber'
      : entry.position.z < -4.5
      ? 'near the front sanctum altar'
      : 'amidst the tiered choir stalls';

  return {
    anchorTitle: `${artifactLabel} near ${entry.name}`,
    anchorArchetype: archetype,
    directionalObjective: `Explore ${zoneDesc} and press E to inspect the ${artifactLabel} placed by ${entry.name}.`,
    spatialReasoningHint: `Parallel-World Link: This clue anchor was placed at ${entry.name} (${zoneDesc}) — compare its position in the virtual castle with the corresponding area of your real room.`,
  };
}

/**
 * Resolves a `clueAnchorId` for every puzzle in `gameData.puzzles` using stable
 * IDs from `sceneObjectRegistry`.
 *
 * CRITICAL DESIGN RULE:
 * Clue anchors are strictly separated from answer objects (`chosenEntry.id !== puzzle.target`).
 * Never highlights or exposes `puzzle.target` before the puzzle is solved.
 */
export function resolvePuzzleClueAnchors(
  gameData: EscapeGameData,
  registry: Map<string, SceneRegistryEntry>
): Map<string, ResolvedClueAnchor> {
  const resolved = new Map<string, ResolvedClueAnchor>();
  const usedAnchors = new Set<string>();
  const allTargetIds = new Set<string>(
    (gameData.puzzles || []).map((p) => p.target).filter(Boolean)
  );

  (gameData.puzzles || []).forEach((puzzle: EscapePuzzleItem, index: number) => {
    let chosenEntry: SceneRegistryEntry | undefined;

    // 1. Honor explicit clueAnchorId if provided in game.json, present in registry, and NOT a puzzle target
    if (
      puzzle.clueAnchorId &&
      puzzle.clueAnchorId !== puzzle.target &&
      !allTargetIds.has(puzzle.clueAnchorId) &&
      registry.has(puzzle.clueAnchorId)
    ) {
      chosenEntry = registry.get(puzzle.clueAnchorId);
    }

    // 2. Check preferred landmark anchors for this puzzle ID (never picking a target object)
    if (!chosenEntry) {
      const prefs = DEFAULT_CLUE_ANCHOR_PREFERENCES[puzzle.id] || [];
      for (const candidateId of prefs) {
        if (
          candidateId !== puzzle.target &&
          !allTargetIds.has(candidateId) &&
          registry.has(candidateId) &&
          !usedAnchors.has(candidateId)
        ) {
          chosenEntry = registry.get(candidateId);
          break;
        }
      }
    }

    // 3. Fallback to any available landmark in the room that is not a target
    if (!chosenEntry) {
      for (const fallbackId of FALLBACK_LANDMARK_IDS) {
        if (
          fallbackId !== puzzle.target &&
          !allTargetIds.has(fallbackId) &&
          registry.has(fallbackId) &&
          !usedAnchors.has(fallbackId)
        ) {
          chosenEntry = registry.get(fallbackId);
          break;
        }
      }
    }

    // 4. Final fallback: pick any registered non-target object that isn't already used
    if (!chosenEntry) {
      for (const [id, entry] of registry.entries()) {
        if (id !== puzzle.target && !allTargetIds.has(id) && !usedAnchors.has(id)) {
          chosenEntry = entry;
          break;
        }
      }
    }

    if (chosenEntry) {
      usedAnchors.add(chosenEntry.id);
      const spec =
        LANDMARK_NARRATIVE_SPECS[chosenEntry.id] ||
        buildFallbackNarrativeSpec(chosenEntry, index);

      resolved.set(puzzle.id, {
        puzzleId: puzzle.id,
        puzzleIndex: index,
        clueAnchorId: chosenEntry.id,
        anchorName: chosenEntry.name,
        anchorTitle: spec.anchorTitle,
        anchorArchetype: spec.anchorArchetype,
        directionalObjective: spec.directionalObjective,
        spatialReasoningHint: spec.spatialReasoningHint,
        position: { ...chosenEntry.position },
        dimensions: { ...chosenEntry.dimensions },
      });
    }
  });

  return resolved;
}

/**
 * Identifies all exit door IDs in the current room.
 */
export function getExitDoorEntries(
  roomData: RoomEnvironmentData,
  registry: Map<string, SceneRegistryEntry>
): SceneRegistryEntry[] {
  const doors: SceneRegistryEntry[] = [];
  const doorIds = new Set<string>();

  for (const obj of roomData.objects || []) {
    if (
      obj.type === 'double_door' ||
      obj.type === 'door' ||
      obj.id.toLowerCase().includes('exit_door')
    ) {
      const entry = registry.get(obj.id);
      if (entry && !doorIds.has(entry.id)) {
        doorIds.add(entry.id);
        doors.push(entry);
      }
    }
  }

  return doors;
}

/**
 * Computes the horizontal distance from the player to the bounding box / center of a scene object.
 */
function computeHorizontalProximity(
  playerX: number,
  playerZ: number,
  pos: { x: number; y: number; z: number },
  dims: { width: number; height: number; depth: number }
): number {
  const halfW = Math.max(0.25, (dims.width || 0.6) * 0.5);
  const halfD = Math.max(0.25, (dims.depth || 0.6) * 0.5);

  const clampedX = Math.max(pos.x - halfW, Math.min(playerX, pos.x + halfW));
  const clampedZ = Math.max(pos.z - halfD, Math.min(playerZ, pos.z + halfD));

  const dx = playerX - clampedX;
  const dz = playerZ - clampedZ;
  return Math.hypot(dx, dz);
}

/**
 * Evaluates player proximity to unlocked puzzle clue anchors and exit doors.
 * Returns the closest interactable target within `maxRangeMeters` (default 2.65m),
 * prioritizing the active unsolved puzzle clue anchor.
 */
export function detectProximityInteraction(
  playerX: number,
  playerZ: number,
  gameData: EscapeGameData,
  roomData: RoomEnvironmentData,
  registry: Map<string, SceneRegistryEntry>,
  solvedPuzzleIds: Set<string>,
  maxRangeMeters = 2.65
): ProximityInteractionTarget | null {
  const anchors = resolvePuzzleClueAnchors(gameData, registry);
  const candidates: ProximityInteractionTarget[] = [];

  // Sequential unlock: puzzles up to solvedPuzzleIds.size are active in normal play
  const maxUnlockedPuzzleIndex = solvedPuzzleIds.size;

  // 1. Check distance to each unlocked puzzle's clueAnchorId
  for (const anchor of anchors.values()) {
    if (anchor.puzzleIndex > maxUnlockedPuzzleIndex) {
      continue;
    }

    const dist = computeHorizontalProximity(
      playerX,
      playerZ,
      anchor.position,
      anchor.dimensions
    );
    if (dist <= maxRangeMeters) {
      // Strong priority bonus for the currently active unsolved riddle
      const isCurrentActive = anchor.puzzleIndex === maxUnlockedPuzzleIndex;
      const effectiveDist = solvedPuzzleIds.has(anchor.puzzleId)
        ? dist + 0.5
        : isCurrentActive
        ? Math.max(0, dist - 0.35)
        : dist;

      candidates.push({
        type: 'puzzle_clue',
        anchorId: anchor.clueAnchorId,
        anchorName: anchor.anchorName,
        anchorTitle: anchor.anchorTitle,
        anchorArchetype: anchor.anchorArchetype,
        directionalObjective: anchor.directionalObjective,
        spatialReasoningHint: anchor.spatialReasoningHint,
        puzzleId: anchor.puzzleId,
        puzzleIndex: anchor.puzzleIndex,
        distance: effectiveDist,
        position: anchor.position,
      });
    }
  }

  // 2. Check distance to exit doors
  const exitDoors = getExitDoorEntries(roomData, registry);
  for (const door of exitDoors) {
    const dist = computeHorizontalProximity(
      playerX,
      playerZ,
      door.position,
      door.dimensions
    );
    if (dist <= maxRangeMeters + 0.35) {
      candidates.push({
        type: 'exit_door',
        anchorId: door.id,
        anchorName: door.name,
        anchorTitle: door.name,
        distance: dist,
        position: door.position,
      });
    }
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0];
}
