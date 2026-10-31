/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  RoomEnvironmentData,
  SceneObject,
  CameraViewMode,
  CollisionBox,
  InventoryData,
  EscapeGameData,
  SceneValidationReport,
  ProximityInteractionTarget,
  InventoryObjectItem,
  SolvedPuzzleRecord,
} from './types/scene';
import {
  SAMPLE_ROOM_PRESETS,
  LECTURE_THEATRE_REFERENCE_PHOTOS,
} from './utils/sampleRooms';
import {
  DEFAULT_GAME_DATA,
  DEFAULT_INVENTORY_DATA,
  integrateInventoryAndGameIntoRoom,
  sceneObjectRegistry,
} from './utils/escapeRoomData';
import { resolvePuzzleClueAnchors } from './utils/interactionSystem';
import {
  GameState,
  initialState,
  confirmObjectShown,
  checkCode,
  requestHint,
} from './gameState';
import {
  HORROR_STYLES,
  HorrorStyleId,
  SAMPLE_ROOM_PHOTOS,
  INITIAL_GAME_RESULT,
  INITIAL_VERIFICATION_RESULT,
  EventInfo,
  GenerateGameResponse,
  Game,
  VerifyAndFixResponse,
} from './utils/escapeData';
import { ThreeViewport } from './components/ThreeViewport';
import { ControlOverlay } from './components/ControlOverlay';
import { MiniMap } from './components/MiniMap';
import { UploadModal } from './components/UploadModal';
import { PhotoCompareModal } from './components/PhotoCompareModal';
import { SceneValidationPanel } from './components/SceneValidationPanel';
import { EscapeProgressHUD } from './components/EscapeProgressHUD';
import { PuzzleModal } from './components/PuzzleModal';
import { CameraVerifyModal } from './components/CameraVerifyModal';
import {
  ExitDoorModal,
  StoryIntroModal,
  VictoryOutroModal,
} from './components/ExitDoorModal';
import { VerificationScreen } from './components/VerificationScreen';
import GhostPanel from './GhostPanel';
import { OrderedCodeSlot } from './hooks/useEscapeGameState';
import { soundManager } from './utils/audio';
import {
  Castle,
  Sparkles,
  ShieldCheck,
  Play,
  Upload,
  Video,
  AlertTriangle,
  Sliders,
  Wrench,
  Compass,
  Camera,
  X,
  ChevronDown,
} from 'lucide-react';

type Step = 'setup' | 'verify' | 'play';

type MediaSelection =
  | { kind: 'none' }
  | { kind: 'photos'; files: File[]; previews: string[] }
  | { kind: 'sample_photos'; urls: string[] }
  | { kind: 'video'; file: File; preview: string };

function fileToBase64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

async function urlToBase64(
  url: string
): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ data: result.split(',')[1], mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function App() {
  // 1. Sequential 3-Step Flow State ('setup' -> 'verify' -> 'play')
  const [step, setStep] = useState<Step>('play');

  // 2. Event & Horror Style Configuration
  const [event, setEvent] = useState<EventInfo>({
    organiser: 'Imperial FinTech & AI Societies',
    players: 20,
    teams: 4,
    minutes: 30,
    scare_level: 'spooky but not scary',
  });
  const [horrorStyleId, setHorrorStyleId] =
    useState<HorrorStyleId>('medieval_gothic');
  const [media, setMedia] = useState<MediaSelection>({
    kind: 'sample_photos',
    urls: SAMPLE_ROOM_PHOTOS,
  });
  const [demoMode, setDemoMode] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 3. Authoritative Escape-Room Generation (`result`) & Verification (`verifyData`) State
  const [result, setResult] =
    useState<GenerateGameResponse>(INITIAL_GAME_RESULT);
  const [verifyData, setVerifyData] = useState<VerifyAndFixResponse | null>(
    INITIAL_VERIFICATION_RESULT
  );
  const [validationReport, setValidationReport] =
    useState<SceneValidationReport | null>(null);

  // 4. Single Authoritative Shared GameState (`src/gameState.ts`)
  const [gameState, setGameState] = useState<GameState>(() => initialState());

  // 5. Spatial Investigation State (`discoveredClueIds`):
  // Tracks which puzzle Clue Anchors have been physically investigated in the 3D scene (`Press E`).
  const [discoveredClueIds, setDiscoveredClueIds] = useState<Set<string>>(
    () => new Set()
  );

  // Dismissible Gameplay Instructions Overlay for first-time players
  const [showHowToPlay, setShowHowToPlay] = useState<boolean>(true);

  // UI Modal states for 3D scene interactions
  const [inspectedPuzzleId, setInspectedPuzzleId] = useState<string | null>(
    null
  );
  const [isCameraVerifyOpen, setIsCameraVerifyOpen] = useState(false);
  const [isExitDoorModalOpen, setIsExitDoorModalOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isOutroOpen, setIsOutroOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [recentlySolvedBanner, setRecentlySolvedBanner] = useState<{
    puzzleId: string;
    puzzleIndex: number;
    rewardDigit: string;
  } | null>(null);

  // Developer-Only Test Mode (toggle via ` key, Ctrl+Shift+D, or button in top bar)
  const [isDevMode, setIsDevMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('dev') === '1' || params.get('dev') === 'true';
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && e.code === 'KeyD') ||
        (e.altKey && e.code === 'KeyD') ||
        e.code === 'Backquote'
      ) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        setIsDevMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Derive InventoryData & EscapeGameData from `result`
  const inventoryData: InventoryData = useMemo(
    () => ({
      room_summary: result.inventory.room_summary,
      landmarks: result.inventory.landmarks || [],
      objects: result.inventory.objects,
    }),
    [result.inventory]
  );

  const gameData: EscapeGameData = useMemo(
    () => ({
      title: result.game.title,
      intro: result.game.intro,
      puzzles: result.game.puzzles,
      final_code: result.game.final_code,
      outro: result.game.outro,
    }),
    [result.game]
  );

  // Synchronize 3D Room Scene with current `inventoryData` and `gameData`
  const [currentRoom, setCurrentRoom] = useState<RoomEnvironmentData>(() =>
    integrateInventoryAndGameIntoRoom(
      SAMPLE_ROOM_PRESETS[0].roomData,
      DEFAULT_INVENTORY_DATA,
      DEFAULT_GAME_DATA
    )
  );

  useEffect(() => {
    setCurrentRoom((prev) =>
      integrateInventoryAndGameIntoRoom(prev, inventoryData, gameData)
    );
  }, [inventoryData, gameData]);

  const [originalPhotos, setOriginalPhotos] = useState<string[]>(
    SAMPLE_ROOM_PRESETS[0].referencePhotos || LECTURE_THEATRE_REFERENCE_PHOTOS
  );
  const [viewMode, setViewMode] = useState<CameraViewMode>('third_person');
  const [selectedObject, setSelectedObject] = useState<SceneObject | null>(
    null
  );
  const [playerPos, setPlayerPos] = useState({
    x: -3.1,
    z: -5.4,
    rotation: 0,
  });
  const [collisionBoxes, setCollisionBoxes] = useState<CollisionBox[]>([]);
  const [isFlashlightOn, setIsFlashlightOn] = useState(true);
  const [resetCameraTrigger, setResetCameraTrigger] = useState(0);
  const [focusObjectTrigger, setFocusObjectTrigger] = useState<{
    id: string;
    count: number;
  } | null>(null);

  // Proximity Interaction Target ("Press E to Investigate")
  const [proximityTarget, setProximityTarget] =
    useState<ProximityInteractionTarget | null>(null);
  const lastProximityKeyRef = useRef<string>('');

  // Derive solved sets, digits, and active puzzle from the authoritative `gameState`
  const puzzles = gameData.puzzles || [];

  const solvedPuzzles: Record<string, SolvedPuzzleRecord> = useMemo(() => {
    const rec: Record<string, SolvedPuzzleRecord> = {};
    for (let i = 0; i < gameState.index && i < puzzles.length; i++) {
      const p = puzzles[i];
      rec[p.id] = {
        puzzleId: p.id,
        rewardDigit: p.reward_digit,
        solvedAt: Date.now(),
        explanation: 'Verified and purified in the Parallel Realm.',
      };
    }
    return rec;
  }, [gameState.index, puzzles]);

  const solvedPuzzleIds = useMemo(
    () => new Set<string>(Object.keys(solvedPuzzles)),
    [solvedPuzzles]
  );

  const solvedTargetIds = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < gameState.index && i < puzzles.length; i++) {
      s.add(puzzles[i].target);
    }
    return s;
  }, [gameState.index, puzzles]);

  // Resolve Clue Anchors (strictly separated from puzzle.target!)
  const resolvedAnchors = useMemo(
    () => resolvePuzzleClueAnchors(gameData, sceneObjectRegistry),
    [gameData, validationReport, currentRoom]
  );

  const currentSequentialPuzzle = puzzles[gameState.index] || null;
  const currentAnchor = currentSequentialPuzzle
    ? resolvedAnchors.get(currentSequentialPuzzle.id)
    : undefined;

  // Track newly solved puzzles to trigger 3D celebration banner & audio
  const prevIndexRef = useRef<number>(gameState.index);
  useEffect(() => {
    if (
      gameState.index > prevIndexRef.current &&
      prevIndexRef.current < puzzles.length
    ) {
      const solvedIdx = gameState.index - 1;
      const justSolved = puzzles[solvedIdx];
      if (justSolved) {
        soundManager.playSceneReady();
        setRecentlySolvedBanner({
          puzzleId: justSolved.id,
          puzzleIndex: solvedIdx,
          rewardDigit: justSolved.reward_digit,
        });
        const timer = setTimeout(() => setRecentlySolvedBanner(null), 5500);
        prevIndexRef.current = gameState.index;
        return () => clearTimeout(timer);
      }
    }
    prevIndexRef.current = gameState.index;
  }, [gameState.index, puzzles]);

  // Watch for escape completion
  const prevEscapedRef = useRef<boolean>(gameState.escaped);
  useEffect(() => {
    if (gameState.escaped && !prevEscapedRef.current) {
      soundManager.playSceneReady();
      setIsOutroOpen(true);
    }
    prevEscapedRef.current = gameState.escaped;
  }, [gameState.escaped]);

  const orderedCodeSlots: OrderedCodeSlot[] = useMemo(
    () =>
      puzzles.map((p, idx) => {
        const isSolved = idx < gameState.index;
        return {
          puzzleId: p.id,
          puzzleIndex: idx,
          isSolved,
          digit: isSolved ? p.reward_digit : null,
        };
      }),
    [puzzles, gameState.index]
  );

  const solvedCount = gameState.index;
  const totalPuzzles = puzzles.length;
  const allPuzzlesSolved =
    gameState.allSolved || (totalPuzzles > 0 && solvedCount >= totalPuzzles);
  const isDoorUnlocked = gameState.escaped;
  const isDoorOpen = gameState.escaped;

  const activePuzzle = useMemo(() => {
    if (!inspectedPuzzleId) return null;
    return puzzles.find((p) => p.id === inspectedPuzzleId) || null;
  }, [puzzles, inspectedPuzzleId]);

  const activePuzzleIndex = useMemo(() => {
    if (!inspectedPuzzleId) return -1;
    return puzzles.findIndex((p) => p.id === inspectedPuzzleId);
  }, [puzzles, inspectedPuzzleId]);

  const inventoryById = useMemo(() => {
    const map = new Map<string, InventoryObjectItem>();
    (inventoryData.objects || []).forEach((obj) => {
      map.set(obj.id, obj);
    });
    return map;
  }, [inventoryData.objects]);

  const activeExpectedObject = useMemo(() => {
    if (!activePuzzle?.target) return undefined;
    return inventoryById.get(activePuzzle.target);
  }, [activePuzzle, inventoryById]);

  const activeAnchorName = useMemo(() => {
    if (!inspectedPuzzleId) return undefined;
    return resolvedAnchors.get(inspectedPuzzleId)?.anchorName;
  }, [inspectedPuzzleId, resolvedAnchors]);

  const isAnyModalOpen =
    Boolean(inspectedPuzzleId) ||
    isCameraVerifyOpen ||
    isExitDoorModalOpen ||
    isIntroOpen ||
    isOutroOpen ||
    isUploadOpen ||
    isCompareOpen;

  // Mark a puzzle's Clue Anchor as discovered in the 3D scene
  const markClueDiscovered = useCallback((puzzleId: string) => {
    setDiscoveredClueIds((prev) => {
      if (prev.has(puzzleId)) return prev;
      const next = new Set(prev);
      next.add(puzzleId);
      return next;
    });
  }, []);

  // GameState Mutation Actions (shared across 3D Modals, Dev Panel, and GhostPanel)
  const openPuzzle = useCallback((puzzleId: string) => {
    soundManager.playClick();
    setInspectedPuzzleId(puzzleId);
    setIsCameraVerifyOpen(false);
  }, []);

  const investigateClueAnchor = useCallback(
    (puzzleId: string) => {
      soundManager.playClick();
      markClueDiscovered(puzzleId);
      setInspectedPuzzleId(puzzleId);
      setIsCameraVerifyOpen(false);
    },
    [markClueDiscovered]
  );

  const closePuzzle = useCallback(() => {
    soundManager.playClick();
    setInspectedPuzzleId(null);
    setIsCameraVerifyOpen(false);
  }, []);

  const openCameraVerify = useCallback(() => {
    soundManager.playClick();
    setIsCameraVerifyOpen(true);
  }, []);

  const openCurrentPuzzleCameraVerify = useCallback(() => {
    const curr = puzzles[gameState.index];
    if (!curr) return;
    soundManager.playClick();
    setInspectedPuzzleId(curr.id);
    setIsCameraVerifyOpen(true);
  }, [puzzles, gameState.index]);

  const closeCameraVerify = useCallback(() => {
    soundManager.playClick();
    setIsCameraVerifyOpen(false);
  }, []);

  const handleMarkPuzzleSolved = useCallback(
    (puzzleId: string, _explanation?: string) => {
      const targetPuzzle = puzzles.find((p) => p.id === puzzleId);
      if (!targetPuzzle) return;

      markClueDiscovered(puzzleId);

      setGameState((prev) => {
        const currentSequential = puzzles[prev.index];
        if (currentSequential && currentSequential.id === puzzleId) {
          return confirmObjectShown(
            result.game as Game,
            prev,
            targetPuzzle.target
          ).state;
        }
        const targetIdx = puzzles.findIndex((p) => p.id === puzzleId);
        if (targetIdx >= prev.index) {
          const nextIndex = targetIdx + 1;
          const nextDigits = puzzles
            .slice(0, nextIndex)
            .map((p) => p.reward_digit);
          return {
            ...prev,
            index: nextIndex,
            digits: nextDigits,
            hintLevel: 0,
            wrongTries: 0,
            allSolved: nextIndex >= puzzles.length,
            lastEvent: `Solved ${targetPuzzle.id} -> digit ${targetPuzzle.reward_digit}`,
          };
        }
        return prev;
      });

      setIsCameraVerifyOpen(false);
    },
    [puzzles, result.game, markClueDiscovered]
  );

  const handleRevealHint = useCallback(() => {
    setGameState((prev) => requestHint(result.game as Game, prev).state);
    soundManager.playClick();
  }, [result.game]);

  const handleSubmitExitCode = useCallback(
    (enteredCode: string): { success: boolean; message: string } => {
      const outcome = checkCode(result.game as Game, gameState, enteredCode);
      setGameState(outcome.state);
      if (outcome.state.escaped) {
        soundManager.playSceneReady();
        setIsExitDoorModalOpen(false);
        setIsOutroOpen(true);
        return {
          success: true,
          message: 'Seal broken! The Gothic Sanctum portal opens.',
        };
      }
      soundManager.playClick();
      return {
        success: false,
        message: 'Incorrect 4-digit cipher. The iron seal remains locked.',
      };
    },
    [gameState, result.game]
  );

  const resetEscapeGame = useCallback(() => {
    soundManager.playClick();
    setGameState(initialState());
    setDiscoveredClueIds(new Set());
    setInspectedPuzzleId(null);
    setIsCameraVerifyOpen(false);
    setIsExitDoorModalOpen(false);
    setRecentlySolvedBanner(null);
  }, []);

  // Step 1 & Step 2 API Handlers (`POST /api/generate-game`, `POST /api/verify`, `GET /api/broken-game`)
  function pickPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    setMedia({
      kind: 'photos',
      files: arr,
      previews: arr.map((f) => URL.createObjectURL(f)),
    });
  }

  function loadSampleRoomPhotos() {
    setMedia({
      kind: 'sample_photos',
      urls: SAMPLE_ROOM_PHOTOS,
    });
    setOriginalPhotos(SAMPLE_ROOM_PHOTOS);
    soundManager.playClick();
  }

  function pickVideo(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    setMedia({ kind: 'video', file: f, preview: URL.createObjectURL(f) });
  }

  async function runGenerateAndReview() {
    setError(null);
    setBusy(
      demoMode
        ? 'Generating your Medieval Gothic Escape Room...'
        : 'Scanning room photos with Gemini & generating puzzles...'
    );
    try {
      let mediaPayload: any = undefined;
      if (!demoMode) {
        if (media.kind === 'photos') {
          mediaPayload = {
            kind: 'photos',
            items: await Promise.all(
              media.files.map(async (f) => ({
                data: await fileToBase64(f),
                mimeType: f.type || 'image/jpeg',
              }))
            ),
          };
          setOriginalPhotos(media.previews);
        } else if (media.kind === 'sample_photos') {
          mediaPayload = {
            kind: 'photos',
            items: await Promise.all(media.urls.map((u) => urlToBase64(u))),
          };
          setOriginalPhotos(media.urls);
        } else if (media.kind === 'video') {
          mediaPayload = {
            kind: 'video',
            data: await fileToBase64(media.file),
            mimeType: media.file.type || 'video/mp4',
          };
        }
      }
      const r = await fetch('/api/generate-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media: mediaPayload,
          event,
          demo: demoMode,
          horrorStyle: horrorStyleId,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Generation failed');
      setResult(data);

      // Automatically verify so Step 2 Review & Start is ready immediately
      const vr = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: data.game,
          usable: data.usable_objects,
          demo: demoMode,
        }),
      });
      if (vr.ok) {
        const vData: VerifyAndFixResponse = await vr.json();
        setVerifyData(vData);
        setResult({ ...data, game: vData.final_game });
      } else {
        setVerifyData(INITIAL_VERIFICATION_RESULT);
      }

      resetEscapeGame();
      setStep('verify');
      soundManager.playSceneReady();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function runVerify(overrideGame?: Game) {
    setError(null);
    setBusy(
      demoMode
        ? 'Running 2-Layer Verification & 3 AI Persona Playtesters...'
        : 'Running 3 AI playtesters + Argon fix loop...'
    );
    try {
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: overrideGame ?? result.game,
          usable: result.usable_objects,
          demo: demoMode,
        }),
      });
      const data: VerifyAndFixResponse = await r.json();
      if (!r.ok) throw new Error((data as any).error ?? 'Verification failed');
      setVerifyData(data);
      setResult({ ...result, game: data.final_game });
      setStep('verify');
      soundManager.playSceneReady();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  async function runBrokenDemo() {
    setError(null);
    setBusy('Loading intentionally broken level & running auto-repair loop...');
    try {
      const b = await fetch('/api/broken-game').then((r) => r.json());
      setResult({
        event,
        inventory: b.inventory,
        usable_objects: b.usable,
        rejected_objects: [],
        game: b.game,
        rule_check: { passed: false, problems: [] },
      });
      const r = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: b.game,
          usable: b.usable,
          demo: demoMode,
        }),
      });
      const data: VerifyAndFixResponse = await r.json();
      setVerifyData(data);
      setStep('verify');
      soundManager.playSceneReady();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }

  // 3D Scene Event Handlers
  const handleProximityTargetChange = useCallback(
    (target: ProximityInteractionTarget | null) => {
      const nextKey = target
        ? `${target.type}:${target.anchorId}:${target.puzzleId || ''}:${Math.round(
            target.distance * 10
          )}`
        : 'none';
      if (nextKey !== lastProximityKeyRef.current) {
        lastProximityKeyRef.current = nextKey;
        setProximityTarget(target);
      }
    },
    []
  );

  // Pressing E near a Clue Anchor marks the clue as discovered and opens the clue panel!
  const handleInteractTrigger = useCallback(() => {
    if (!proximityTarget) return;
    if (proximityTarget.type === 'exit_door') {
      if (isDoorUnlocked) {
        setIsOutroOpen(true);
      } else {
        setIsExitDoorModalOpen(true);
      }
    } else if (
      proximityTarget.type === 'puzzle_clue' &&
      proximityTarget.puzzleId
    ) {
      investigateClueAnchor(proximityTarget.puzzleId);
    }
  }, [proximityTarget, isDoorUnlocked, investigateClueAnchor]);

  const handleSceneGenerated = useCallback(
    (sceneData: RoomEnvironmentData, imageSrcs: string[]) => {
      const mergedRoom = integrateInventoryAndGameIntoRoom(
        sceneData,
        inventoryData,
        gameData
      );
      setCurrentRoom(mergedRoom);
      setOriginalPhotos(imageSrcs);
      setSelectedObject(null);
      resetEscapeGame();
      setResetCameraTrigger((prev) => prev + 1);
    },
    [inventoryData, gameData, resetEscapeGame]
  );

  const handleUpdateJsonFiles = useCallback(
    (newInventory: InventoryData, newGame: EscapeGameData) => {
      setResult((prev: GenerateGameResponse) => ({
        ...prev,
        inventory: {
          room_summary: newInventory.room_summary,
          landmarks: newInventory.landmarks || [],
          objects: newInventory.objects as any,
        },
        usable_objects: newInventory.objects as any,
        game: newGame as Game,
      }));
      resetEscapeGame();
      setCurrentRoom((prev) =>
        integrateInventoryAndGameIntoRoom(prev, newInventory, newGame)
      );
    },
    [resetEscapeGame]
  );

  const handleResetDefaultJson = useCallback(() => {
    setResult(INITIAL_GAME_RESULT);
    setVerifyData(INITIAL_VERIFICATION_RESULT);
    resetEscapeGame();
    setCurrentRoom((prev) =>
      integrateInventoryAndGameIntoRoom(
        prev,
        DEFAULT_INVENTORY_DATA,
        DEFAULT_GAME_DATA
      )
    );
  }, [resetEscapeGame]);

  const handleFocusObject = useCallback((objectId: string) => {
    setFocusObjectTrigger((prev) => ({
      id: objectId,
      count: (prev?.count || 0) + 1,
    }));
  }, []);

  const handleUpdatePlayerPos = useCallback(
    (x: number, z: number, rotation: number) => {
      setPlayerPos({ x, z, rotation });
    },
    []
  );

  const handleCollisionBoxesUpdate = useCallback((boxes: CollisionBox[]) => {
    setCollisionBoxes(boxes);
  }, []);

  const handleResetCamera = useCallback(() => {
    setResetCameraTrigger((prev) => prev + 1);
  }, []);

  const handleToggleFlashlight = useCallback(() => {
    setIsFlashlightOn((prev) => !prev);
  }, []);

  const handleUpdateCeilingHeight = useCallback((newHeight: number) => {
    setCurrentRoom((prev) => ({
      ...prev,
      roomHeight: Math.max(2.8, Math.min(20, Math.round(newHeight * 10) / 10)),
    }));
  }, []);

  const handleUpdateRoomScale = useCallback((scaleMultiplier: number) => {
    setCurrentRoom((prev) => {
      const clampedMult = Math.max(0.6, Math.min(2.5, scaleMultiplier));
      const newWidth = Math.round(prev.roomWidth * clampedMult * 10) / 10;
      const newLength = Math.round(prev.roomLength * clampedMult * 10) / 10;
      const newHeight =
        Math.round(
          prev.roomHeight * Math.min(1.3, Math.max(0.9, clampedMult)) * 10
        ) / 10;

      const scaledObjects = (prev.objects || []).map((obj) => ({
        ...obj,
        x: Math.round(obj.x * clampedMult * 100) / 100,
        z: Math.round(obj.z * clampedMult * 100) / 100,
        width: Math.round(obj.width * Math.min(1.25, clampedMult) * 100) / 100,
        depth: Math.round(obj.depth * Math.min(1.25, clampedMult) * 100) / 100,
      }));

      const scaledTieredFloor = prev.tieredFloor
        ? {
            ...prev.tieredFloor,
            startZ:
              Math.round(prev.tieredFloor.startZ * clampedMult * 100) / 100,
            endZ: Math.round(prev.tieredFloor.endZ * clampedMult * 100) / 100,
            aisleXPositions: prev.tieredFloor.aisleXPositions?.map(
              (ax) => Math.round(ax * clampedMult * 100) / 100
            ),
          }
        : undefined;

      return {
        ...prev,
        roomWidth: Math.max(6, Math.min(48, newWidth)),
        roomLength: Math.max(6, Math.min(58, newLength)),
        roomHeight: Math.max(3.0, Math.min(20, newHeight)),
        tieredFloor: scaledTieredFloor,
        objects: scaledObjects,
      };
    });
  }, []);

  const selectedStyle =
    HORROR_STYLES.find((s) => s.id === horrorStyleId) || HORROR_STYLES[0];

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Top 3-Step Navigation Header (1. Create Your World -> 2. Review & Start -> 3. Play) */}
      <header className="shrink-0 h-12 px-4 bg-slate-950/95 border-b border-amber-900/40 flex items-center justify-between gap-3 z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
            <Castle className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-wide text-amber-100 truncate">
                Parallel Escape
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700/50 text-[10px] font-mono text-amber-300">
                {selectedStyle.label}
              </span>
            </div>
          </div>
        </div>

        {/* Clear Three-Step User Flow Switcher */}
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => {
              setStep('setup');
              soundManager.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              step === 'setup'
                ? 'bg-amber-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>1. Create Your World</span>
          </button>
          <button
            onClick={() => {
              setStep('verify');
              soundManager.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              step === 'verify'
                ? 'bg-amber-600 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>2. Review &amp; Start</span>
          </button>
          <button
            onClick={() => {
              setStep('play');
              soundManager.playClick();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              step === 'play'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>3. Play</span>
          </button>
        </div>

        {/* Right Controls: Offline Demo Toggle + Developer Mode Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="accent-amber-500"
            />
            <span>Offline Demo</span>
          </label>
          <button
            onClick={() => {
              setIsDevMode((prev) => !prev);
              soundManager.playClick();
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-colors cursor-pointer ${
              isDevMode
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Developer Debug Mode (` key)"
          >
            <Wrench className="w-3 h-3" />
            <span className="hidden sm:inline">Dev Mode</span>
          </button>
        </div>
      </header>

      {/* Busy / Error Notification Banner */}
      {(busy || error) && (
        <div className="shrink-0 px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs z-30">
          {busy && (
            <div className="flex items-center gap-2 text-amber-300 font-medium">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>{busy}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 font-medium">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1 — CREATE YOUR WORLD (Clean, Streamlined + Collapsible Advanced) */}
      {/* ===================================================================== */}
      {step === 'setup' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/95 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="space-y-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Step 1 · Create Your World
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Turn Your Real Room into a Medieval Gothic Escape Room
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Upload photographs or a short video of your real room. Gemini
                  identifies real-world objects, hides spatial Clue Anchors
                  across a 3D Gothic castle counterpart, and verifies real
                  objects through your camera.
                </p>
              </div>

              {/* Media Upload Bar */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Room Photographs or Video
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
                    <Upload className="w-4 h-4 text-amber-400" />
                    <span>Upload Room Photos (3–10)</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => pickPhotos(e.target.files)}
                    />
                  </label>
                  <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-2 transition-colors">
                    <Video className="w-4 h-4 text-amber-400" />
                    <span>Upload Room Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => pickVideo(e.target.files)}
                    />
                  </label>
                  <button
                    onClick={loadSampleRoomPhotos}
                    className="px-4 py-2.5 bg-amber-950/70 hover:bg-amber-900/80 border border-amber-700/60 text-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Use 6 Sample Lecture Hall Photos
                  </button>
                </div>

                {media.kind === 'photos' && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                    {media.previews.map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt={`Upload ${i + 1}`}
                        className="h-20 w-full object-cover rounded-lg border border-slate-700"
                      />
                    ))}
                  </div>
                )}

                {media.kind === 'sample_photos' && (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                    {media.urls.map((u, i) => (
                      <img
                        key={i}
                        src={u}
                        alt={`Sample Angle ${i + 1}`}
                        className="h-20 w-full object-cover rounded-lg border border-amber-800/50"
                      />
                    ))}
                  </div>
                )}

                {media.kind === 'video' && (
                  <video
                    src={media.preview}
                    controls
                    className="w-full max-h-44 rounded-xl border border-slate-700"
                  />
                )}
              </div>

              {/* Collapsible Advanced Settings */}
              <details className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 group">
                <summary className="cursor-pointer text-xs font-semibold text-slate-300 hover:text-amber-300 flex items-center justify-between select-none">
                  <span className="flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Advanced Settings (Theme, Event &amp; Players)</span>
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>

                <div className="mt-4 pt-4 border-t border-slate-800 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-amber-300">
                      Parallel-World Aesthetic Direction
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {HORROR_STYLES.map((style) => {
                        const active = style.id === horrorStyleId;
                        return (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => {
                              setHorrorStyleId(style.id);
                              soundManager.playClick();
                            }}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              active
                                ? 'bg-amber-950/50 border-amber-500 text-amber-100 shadow-lg'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">
                                {style.label}
                              </span>
                              {active && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                              {style.subtitle}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <label>
                      <span className="text-slate-400">Organiser / Guild</span>
                      <input
                        className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        value={event.organiser}
                        onChange={(e) =>
                          setEvent({ ...event, organiser: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span className="text-slate-400">Players</span>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        value={event.players}
                        onChange={(e) =>
                          setEvent({ ...event, players: +e.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span className="text-slate-400">Duration (mins)</span>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-100"
                        value={event.minutes}
                        onChange={(e) =>
                          setEvent({ ...event, minutes: +e.target.value })
                        }
                      />
                    </label>
                  </div>
                </div>
              </details>

              {/* Single Prominent Primary CTA */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <button
                  disabled={!!busy}
                  onClick={runGenerateAndReview}
                  className="flex-1 py-3.5 px-6 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-sm shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {busy ? busy : 'Generate My Escape Room'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2 — REVIEW & START                                               */}
      {/* ===================================================================== */}
      {step === 'verify' && verifyData && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-5xl mx-auto">
            <VerificationScreen
              verifyData={verifyData}
              usableObjects={result.usable_objects}
              demoMode={demoMode}
              onToggleDemoMode={setDemoMode}
              onLoadBrokenDemo={runBrokenDemo}
              onVerifyCurrentGame={() => runVerify(verifyData.final_game)}
              isVerifying={Boolean(busy)}
              verifyError={error}
              onBack={() => setStep('setup')}
              onApprove={() => {
                setResult({ ...result, game: verifyData.final_game });
                resetEscapeGame();
                setStep('play');
                soundManager.playSceneReady();
              }}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3 — PLAY: Side-by-Side 3D Parallel World + Ghost Guide           */}
      {/* ===================================================================== */}
      {step === 'play' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* Primary 3D Medieval Gothic Viewport Canvas (~70% width on desktop) */}
          <div className="relative lg:col-span-8 xl:col-span-8 h-full min-h-[420px] overflow-hidden bg-slate-950">
            <ThreeViewport
              roomData={currentRoom}
              inventoryData={inventoryData}
              gameData={gameData}
              viewMode={viewMode}
              onSelectObject={setSelectedObject}
              onUpdatePlayerPos={handleUpdatePlayerPos}
              onCollisionBoxesUpdate={handleCollisionBoxesUpdate}
              onValidationReport={setValidationReport}
              resetCameraTrigger={resetCameraTrigger}
              focusObjectTrigger={focusObjectTrigger}
              highlightedObjectId={isDevMode ? selectedObject?.id ?? null : null}
              isFlashlightOn={isFlashlightOn}
              onToggleFlashlight={handleToggleFlashlight}
              isModalOpen={isAnyModalOpen}
              solvedPuzzleIds={solvedPuzzleIds}
              solvedTargetIds={solvedTargetIds}
              discoveredClueIds={discoveredClueIds}
              isDevMode={isDevMode}
              allPuzzlesSolved={allPuzzlesSolved}
              isDoorOpen={isDoorOpen}
              onProximityTargetChange={handleProximityTargetChange}
              onInteractTrigger={handleInteractTrigger}
            />

            {/* Escape-Room Top Progress HUD & Proximity E Interaction Prompt */}
            <EscapeProgressHUD
              gameData={gameData}
              orderedCodeSlots={orderedCodeSlots}
              solvedCount={solvedCount}
              totalPuzzles={totalPuzzles}
              allPuzzlesSolved={allPuzzlesSolved}
              isDoorUnlocked={isDoorUnlocked}
              discoveredClueIds={discoveredClueIds}
              currentAnchor={currentAnchor}
              isCameraVerifyOpen={isCameraVerifyOpen}
              proximityTarget={!isAnyModalOpen ? proximityTarget : null}
              recentlySolvedBanner={recentlySolvedBanner}
              onOpenPuzzle={openPuzzle}
              onOpenExitDoor={() => setIsExitDoorModalOpen(true)}
              onOpenIntro={() => setIsIntroOpen(true)}
              onOpenOutro={() => setIsOutroOpen(true)}
              onOpenHowToPlay={() => setShowHowToPlay(true)}
            />

            {/* Dismissible Gameplay Instructions Overlay */}
            {showHowToPlay && !isAnyModalOpen && (
              <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm">
                <div className="w-full max-w-md bg-slate-900/95 border border-amber-500/40 rounded-2xl p-6 shadow-2xl space-y-4 text-slate-100">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Compass className="w-5 h-5 text-amber-400" />
                      <h2 className="text-base font-bold text-white">
                        How to Play Parallel Escape
                      </h2>
                    </div>
                    <button
                      onClick={() => setShowHowToPlay(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <kbd className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-bold shrink-0">
                        W A S D
                      </kbd>
                      <span>Move your investigator through the 3D Gothic castle</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold shrink-0">
                        Mouse
                      </kbd>
                      <span>Drag to look around &amp; scroll to zoom</span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <kbd className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 font-mono font-bold shrink-0">
                        E
                      </kbd>
                      <span>
                        Investigate a glowing <strong>Clue Anchor</strong> in 3D to uncover its riddle
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono font-bold shrink-0 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5" />
                        Cam
                      </span>
                      <span>
                        Show the matching real-world object to the camera to purify the curse &amp; claim a code digit
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHowToPlay(false)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition cursor-pointer"
                  >
                    Start Exploring the 3D Castle
                  </button>
                </div>
              </div>
            )}

            {/* Developer-Only Scene Validation & Parallel Mapping Panel */}
            {isDevMode && (
              <SceneValidationPanel
                validationReport={validationReport}
                inventoryData={inventoryData}
                gameData={gameData}
                solvedTargetIds={solvedTargetIds}
                highlightedObjectId={selectedObject?.id ?? null}
                onFocusObject={handleFocusObject}
                onUpdateJsonFiles={handleUpdateJsonFiles}
                onResetDefaultJson={handleResetDefaultJson}
                onDevSimulateCorrect={() => {
                  const currentP = puzzles[gameState.index];
                  if (currentP) {
                    markClueDiscovered(currentP.id);
                    setGameState(
                      (prev) =>
                        confirmObjectShown(
                          result.game as Game,
                          prev,
                          currentP.target
                        ).state
                    );
                  }
                }}
                onDevSimulateWrong={() => {
                  setGameState(
                    (prev) =>
                      confirmObjectShown(
                        result.game as Game,
                        prev,
                        'wrong_object_id'
                      ).state
                  );
                }}
                onDevRequestHint={handleRevealHint}
                onDevUnlockExit={() => {
                  handleSubmitExitCode(result.game.final_code);
                }}
                onDevResetGame={resetEscapeGame}
              />
            )}

            {/* Top-Right 2D Room Radar / Mini-map */}
            <MiniMap
              roomData={currentRoom}
              playerPos={playerPos}
              collisionBoxes={collisionBoxes}
            />

            {/* Collapsible Ergonomic Bottom Dock & HUD */}
            <ControlOverlay
              viewMode={viewMode}
              onSetViewMode={setViewMode}
              onResetCamera={handleResetCamera}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenPhotoCompare={() => setIsCompareOpen(true)}
              hasOriginalPhoto={originalPhotos.length > 0}
              selectedObject={selectedObject}
              roomTitle={currentRoom.roomType}
              roomWidth={currentRoom.roomWidth || 16.0}
              roomLength={currentRoom.roomLength || 24.0}
              roomHeight={currentRoom.roomHeight || 7.2}
              objectsCount={currentRoom.objects?.length || 0}
              isFlashlightOn={isFlashlightOn}
              onToggleFlashlight={handleToggleFlashlight}
              onUpdateCeilingHeight={handleUpdateCeilingHeight}
              onUpdateRoomScale={handleUpdateRoomScale}
            />
          </div>

          {/* Right Side Panel: Live / Offline Ghost Guide & Webcam Verification (~30% width) */}
          <div className="lg:col-span-4 xl:col-span-4 h-full overflow-y-auto bg-slate-950 border-l border-amber-900/40 p-4">
            <GhostPanel
              game={result.game as Game}
              objects={result.usable_objects}
              demoMode={demoMode}
              onState={setGameState}
              externalState={gameState}
              discoveredClueIds={discoveredClueIds}
              resolvedAnchors={resolvedAnchors}
              isDevMode={isDevMode}
              onFocusObjectIn3D={handleFocusObject}
              onOpenCameraVerifyModal={openCurrentPuzzleCameraVerify}
              onDiscoverCurrentClueInDev={markClueDiscovered}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3D INTERACTION MODALS (Synced with authoritative `gameState`)         */}
      {/* ===================================================================== */}
      <PuzzleModal
        isOpen={Boolean(activePuzzle) && !isCameraVerifyOpen}
        puzzle={activePuzzle}
        puzzleIndex={activePuzzleIndex}
        allPuzzles={puzzles}
        solvedPuzzles={solvedPuzzles}
        discoveredClueIds={discoveredClueIds}
        resolvedAnchors={resolvedAnchors}
        revealedHintCount={
          activePuzzleIndex === gameState.index
            ? gameState.hintLevel
            : activePuzzleIndex < gameState.index
            ? activePuzzle?.hints?.length || 0
            : 0
        }
        anchorName={activeAnchorName}
        isDevMode={isDevMode}
        expectedTargetObject={activeExpectedObject}
        onClose={closePuzzle}
        onSelectPuzzle={openPuzzle}
        onRevealHint={handleRevealHint}
        onOpenCameraVerify={openCameraVerify}
        onDevDiscoverClue={markClueDiscovered}
        onDevSimulateSolve={(puzzleId) =>
          handleMarkPuzzleSolved(
            puzzleId,
            'Simulated verification match in Developer Test Mode.'
          )
        }
      />

      <CameraVerifyModal
        isOpen={Boolean(activePuzzle) && isCameraVerifyOpen}
        puzzle={activePuzzle}
        puzzleIndex={activePuzzleIndex}
        expectedObject={activeExpectedObject}
        isDevMode={isDevMode}
        onBackToClue={closeCameraVerify}
        onClose={closePuzzle}
        onVerifiedSuccess={(puzzleId, explanation) => {
          handleMarkPuzzleSolved(puzzleId, explanation);
        }}
      />

      <ExitDoorModal
        isOpen={isExitDoorModalOpen}
        gameData={gameData}
        orderedCodeSlots={orderedCodeSlots}
        solvedCount={solvedCount}
        totalPuzzles={totalPuzzles}
        allPuzzlesSolved={allPuzzlesSolved}
        isDoorUnlocked={isDoorUnlocked}
        onClose={() => setIsExitDoorModalOpen(false)}
        onSubmitCode={handleSubmitExitCode}
        onOpenPuzzle={(puzzleId) => {
          setIsExitDoorModalOpen(false);
          openPuzzle(puzzleId);
        }}
      />

      <StoryIntroModal
        isOpen={isIntroOpen}
        gameData={gameData}
        onClose={() => setIsIntroOpen(false)}
      />

      <VictoryOutroModal
        isOpen={isOutroOpen}
        gameData={gameData}
        onClose={() => setIsOutroOpen(false)}
        onPlayAgain={() => {
          resetEscapeGame();
          setIsOutroOpen(false);
        }}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSceneGenerated={handleSceneGenerated}
        hasExistingScene={Boolean(currentRoom)}
        inventoryData={inventoryData}
        gameData={gameData}
      />

      <PhotoCompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        originalImages={originalPhotos}
        roomData={currentRoom}
      />
    </div>
  );
}
