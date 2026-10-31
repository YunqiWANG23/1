import { useState, useCallback, useMemo } from 'react';
import {
  EscapeGameData,
  EscapePuzzleItem,
  SolvedPuzzleRecord,
} from '../types/scene';
import { soundManager } from '../utils/audio';

export interface OrderedCodeSlot {
  puzzleId: string;
  puzzleIndex: number;
  isSolved: boolean;
  digit: string | null;
}

export function useEscapeGameState(gameData: EscapeGameData) {
  const [activePuzzleId, setActivePuzzleId] = useState<string | null>(null);
  const [isCameraVerifyOpen, setIsCameraVerifyOpen] = useState(false);
  const [isExitDoorModalOpen, setIsExitDoorModalOpen] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(false);
  const [isOutroOpen, setIsOutroOpen] = useState(false);

  const [solvedPuzzles, setSolvedPuzzles] = useState<Record<string, SolvedPuzzleRecord>>({});
  const [revealedHints, setRevealedHints] = useState<Record<string, number>>({});
  const [isDoorUnlocked, setIsDoorUnlocked] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);

  const [recentlySolvedBanner, setRecentlySolvedBanner] = useState<{
    puzzleId: string;
    puzzleIndex: number;
    rewardDigit: string;
  } | null>(null);

  const puzzles = useMemo(() => gameData.puzzles || [], [gameData.puzzles]);

  const activePuzzle: EscapePuzzleItem | null = useMemo(() => {
    if (!activePuzzleId) return null;
    return puzzles.find((p) => p.id === activePuzzleId) || null;
  }, [activePuzzleId, puzzles]);

  const activePuzzleIndex = useMemo(() => {
    if (!activePuzzleId) return -1;
    return puzzles.findIndex((p) => p.id === activePuzzleId);
  }, [activePuzzleId, puzzles]);

  // Preserve the exact ordering of `game.puzzles` when assembling the final unlock code slots,
  // regardless of the order in which the player solves the puzzles.
  const orderedCodeSlots: OrderedCodeSlot[] = useMemo(() => {
    return puzzles.map((puzzle, index) => {
      const record = solvedPuzzles[puzzle.id];
      return {
        puzzleId: puzzle.id,
        puzzleIndex: index,
        isSolved: Boolean(record),
        digit: record ? record.rewardDigit : null,
      };
    });
  }, [puzzles, solvedPuzzles]);

  const solvedCount = useMemo(
    () => orderedCodeSlots.filter((s) => s.isSolved).length,
    [orderedCodeSlots]
  );

  const totalPuzzles = puzzles.length;
  const allPuzzlesSolved = totalPuzzles > 0 && solvedCount >= totalPuzzles;

  const solvedPuzzleIds = useMemo(() => {
    return new Set(Object.keys(solvedPuzzles));
  }, [solvedPuzzles]);

  // Set of target object IDs ONLY for puzzles that have already been solved
  // (Never expose or highlight target objects before solving!)
  const solvedTargetIds = useMemo(() => {
    const targets = new Set<string>();
    puzzles.forEach((p) => {
      if (solvedPuzzles[p.id] && p.target) {
        targets.add(p.target);
      }
    });
    return targets;
  }, [puzzles, solvedPuzzles]);

  const openPuzzle = useCallback((puzzleId: string) => {
    setActivePuzzleId(puzzleId);
    setIsCameraVerifyOpen(false);
    setIsExitDoorModalOpen(false);
    soundManager.playInvestigateOpen();
  }, []);

  const closePuzzle = useCallback(() => {
    setActivePuzzleId(null);
    setIsCameraVerifyOpen(false);
  }, []);

  const openCameraVerify = useCallback(() => {
    setIsCameraVerifyOpen(true);
    soundManager.playClick();
  }, []);

  const closeCameraVerify = useCallback(() => {
    setIsCameraVerifyOpen(false);
  }, []);

  const revealNextHint = useCallback((puzzleId: string, maxHints: number) => {
    setRevealedHints((prev) => {
      const current = prev[puzzleId] || 0;
      if (current >= maxHints) return prev;
      return {
        ...prev,
        [puzzleId]: current + 1,
      };
    });
    soundManager.playClick();
  }, []);

  // Idempotent: Each puzzle may award its reward digit only once
  const markPuzzleSolved = useCallback(
    (puzzleId: string, explanation?: string) => {
      const puzzleIndex = puzzles.findIndex((p) => p.id === puzzleId);
      const puzzle = puzzles[puzzleIndex];
      if (!puzzle) return;

      setSolvedPuzzles((prev) => {
        if (prev[puzzleId]) {
          // Already solved — do not award duplicate digit
          return prev;
        }
        const record: SolvedPuzzleRecord = {
          puzzleId,
          rewardDigit: puzzle.reward_digit,
          solvedAt: Date.now(),
          explanation,
        };
        return {
          ...prev,
          [puzzleId]: record,
        };
      });

      soundManager.playPuzzleSolved();
      setRecentlySolvedBanner({
        puzzleId,
        puzzleIndex: puzzleIndex >= 0 ? puzzleIndex : 0,
        rewardDigit: puzzle.reward_digit,
      });

      window.setTimeout(() => {
        setRecentlySolvedBanner((curr) => (curr?.puzzleId === puzzleId ? null : curr));
      }, 5200);
    },
    [puzzles]
  );

  const openExitDoorModal = useCallback(() => {
    setActivePuzzleId(null);
    setIsCameraVerifyOpen(false);
    setIsExitDoorModalOpen(true);
    soundManager.playInvestigateOpen();
  }, []);

  const closeExitDoorModal = useCallback(() => {
    setIsExitDoorModalOpen(false);
  }, []);

  const submitExitCode = useCallback(
    (enteredCode: string): { success: boolean; message: string } => {
      if (!allPuzzlesSolved) {
        soundManager.playPuzzleFail();
        return {
          success: false,
          message: `The spectral seal remains bound. Solve all ${totalPuzzles} riddles (${solvedCount}/${totalPuzzles} solved) before unlocking the exit doors.`,
        };
      }

      const normalizedInput = enteredCode.trim();
      const expectedCode = String(gameData.final_code || '').trim();

      if (normalizedInput === expectedCode) {
        setIsDoorUnlocked(true);
        setIsDoorOpen(true);
        setIsGameWon(true);
        soundManager.playDoorUnlock();
        // Close keypad after brief moment and reveal victory outro
        window.setTimeout(() => {
          setIsExitDoorModalOpen(false);
          setIsOutroOpen(true);
        }, 1200);
        return {
          success: true,
          message: 'Banishing code accepted! The exit doors are swinging open...',
        };
      }

      soundManager.playPuzzleFail();
      return {
        success: false,
        message: 'Incorrect banishing code. Check the ordered digits you collected and try again.',
      };
    },
    [allPuzzlesSolved, totalPuzzles, solvedCount, gameData.final_code]
  );

  const resetEscapeGame = useCallback(() => {
    setActivePuzzleId(null);
    setIsCameraVerifyOpen(false);
    setIsExitDoorModalOpen(false);
    setIsOutroOpen(false);
    setSolvedPuzzles({});
    setRevealedHints({});
    setIsDoorUnlocked(false);
    setIsDoorOpen(false);
    setIsGameWon(false);
    setRecentlySolvedBanner(null);
  }, []);

  return {
    activePuzzleId,
    activePuzzle,
    activePuzzleIndex,
    isCameraVerifyOpen,
    isExitDoorModalOpen,
    isIntroOpen,
    setIsIntroOpen,
    isOutroOpen,
    setIsOutroOpen,
    solvedPuzzles,
    solvedPuzzleIds,
    solvedTargetIds,
    revealedHints,
    orderedCodeSlots,
    solvedCount,
    totalPuzzles,
    allPuzzlesSolved,
    isDoorUnlocked,
    isDoorOpen,
    isGameWon,
    recentlySolvedBanner,
    openPuzzle,
    closePuzzle,
    openCameraVerify,
    closeCameraVerify,
    revealNextHint,
    markPuzzleSolved,
    openExitDoorModal,
    closeExitDoorModal,
    submitExitCode,
    resetEscapeGame,
  };
}
