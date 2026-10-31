import React from 'react';
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Compass,
  DoorOpen,
  HelpCircle,
  KeyRound,
  Lock,
  Sparkles,
} from 'lucide-react';
import { EscapeGameData, ProximityInteractionTarget } from '../types/scene';
import { OrderedCodeSlot } from '../hooks/useEscapeGameState';
import { ResolvedClueAnchor } from '../utils/interactionSystem';

interface EscapeProgressHUDProps {
  gameData: EscapeGameData;
  orderedCodeSlots: OrderedCodeSlot[];
  solvedCount: number;
  totalPuzzles: number;
  allPuzzlesSolved: boolean;
  isDoorUnlocked: boolean;
  discoveredClueIds?: Set<string>;
  currentAnchor?: ResolvedClueAnchor;
  isCameraVerifyOpen?: boolean;
  proximityTarget: ProximityInteractionTarget | null;
  recentlySolvedBanner: {
    puzzleId: string;
    puzzleIndex: number;
    rewardDigit: string;
  } | null;
  onOpenPuzzle: (puzzleId: string) => void;
  onOpenExitDoor: () => void;
  onOpenIntro: () => void;
  onOpenOutro: () => void;
  onOpenHowToPlay?: () => void;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export const EscapeProgressHUD: React.FC<EscapeProgressHUDProps> = ({
  gameData,
  orderedCodeSlots,
  solvedCount,
  totalPuzzles,
  allPuzzlesSolved,
  isDoorUnlocked,
  discoveredClueIds = new Set(),
  currentAnchor,
  isCameraVerifyOpen = false,
  proximityTarget,
  recentlySolvedBanner,
  onOpenPuzzle,
  onOpenExitDoor,
  onOpenIntro,
  onOpenOutro,
  onOpenHowToPlay,
}) => {
  const isCurrentAnchorDiscovered = currentAnchor
    ? discoveredClueIds.has(currentAnchor.puzzleId)
    : false;

  return (
    <>
      {/* Top-Center Escape Room Progress & Ordered Code Bar */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex flex-col items-center gap-2 max-w-[94vw]">
        <div className="bg-slate-950/90 backdrop-blur-xl border border-amber-500/30 rounded-xl px-4 py-2.5 shadow-2xl flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Story / Briefing Trigger */}
          <button
            onClick={onOpenIntro}
            className="flex items-center gap-2 text-left group pr-2 border-r border-slate-800/90 cursor-pointer"
            title="Read Escape Room Story Briefing"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:bg-amber-500/25 transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400/90">
                Parallel Escape
              </div>
              <div className="text-xs font-semibold text-slate-100 max-w-[180px] truncate group-hover:text-amber-200 transition-colors">
                {gameData.title || 'Phantom Lecture'}
              </div>
            </div>
          </button>

          {/* Ordered Reward Digit Slots (Preserves game.puzzles order regardless of solve order) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {orderedCodeSlots.map((slot) => {
              const roman =
                ROMAN_NUMERALS[slot.puzzleIndex] || String(slot.puzzleIndex + 1);
              const isDiscovered = discoveredClueIds.has(slot.puzzleId);
              return (
                <button
                  key={slot.puzzleId}
                  onClick={() => onOpenPuzzle(slot.puzzleId)}
                  title={
                    slot.isSolved
                      ? `Riddle ${roman} Solved • Collected Digit: ${slot.digit}`
                      : isDiscovered
                      ? `Riddle ${roman} Discovered • Click to view clue & verify`
                      : `Riddle ${roman} Undiscovered • Explore the 3D room to find the Clue Anchor`
                  }
                  className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    slot.isSolved
                      ? 'bg-emerald-950/75 border-emerald-400/60 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : isDiscovered
                      ? 'bg-sky-950/70 border-sky-400/60 text-sky-100 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      : 'bg-slate-900/85 border-slate-700/80 hover:border-amber-400/50 text-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400">
                      Seal {roman}
                    </span>
                    <span className="text-[11px] font-medium mt-0.5">
                      {slot.isSolved
                        ? 'Solved'
                        : isDiscovered
                        ? 'Clue Found'
                        : 'Explore 3D'}
                    </span>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-md font-mono text-sm font-bold flex items-center justify-center border ${
                      slot.isSolved
                        ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                        : isDiscovered
                        ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                        : 'bg-slate-950 border-slate-700 text-slate-500'
                    }`}
                  >
                    {slot.isSolved ? slot.digit : '?'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Exit Door & How to Play Buttons */}
          <div className="pl-2 border-l border-slate-800/90 flex items-center gap-2">
            {isDoorUnlocked ? (
              <button
                onClick={onOpenOutro}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-xs font-semibold hover:bg-emerald-500/30 transition-all shadow-[0_0_18px_rgba(16,185,129,0.3)] cursor-pointer"
              >
                <DoorOpen className="w-4 h-4 text-emerald-300" />
                <span>Exit Unlocked</span>
              </button>
            ) : (
              <button
                onClick={onOpenExitDoor}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  allPuzzlesSolved
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200 hover:bg-amber-500/30 animate-pulse shadow-[0_0_16px_rgba(245,158,11,0.35)]'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
                title={
                  allPuzzlesSolved
                    ? 'All digits collected! Approach the exit door and press E or click to enter the code.'
                    : `Solve all ${totalPuzzles} riddles (${solvedCount}/${totalPuzzles}) to unlock the exit door.`
                }
              >
                {allPuzzlesSolved ? (
                  <>
                    <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                    <span>Enter Exit Code</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {solvedCount}/{totalPuzzles} Digits
                    </span>
                  </>
                )}
              </button>
            )}

            {onOpenHowToPlay && (
              <button
                onClick={onOpenHowToPlay}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-amber-200 text-xs font-medium transition-colors cursor-pointer"
                title="How to Play & Controls"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">How to Play</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Contextual Gameplay Prompt Banner */}
        {recentlySolvedBanner ? (
          <div className="bg-emerald-950/95 border border-emerald-400/70 text-emerald-100 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3 animate-bounce">
            <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold">
                Curse broken! Digit{' '}
                <span className="inline-block px-2 py-0.5 mx-0.5 rounded bg-emerald-500/30 border border-emerald-300 font-mono font-bold text-emerald-200">
                  {recentlySolvedBanner.rewardDigit}
                </span>{' '}
                revealed
              </span>{' '}
              —{' '}
              {allPuzzlesSolved
                ? 'All 4 digits collected! Head to the Fortress Exit Door!'
                : 'Find the next clue anchor in the 3D room!'}
            </div>
          </div>
        ) : isCameraVerifyOpen ? (
          <div className="bg-amber-950/90 border border-amber-400/60 text-amber-100 px-4 py-1.5 rounded-xl shadow-xl flex items-center gap-2 text-xs">
            <Camera className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-semibold">Show the object to the camera</span>
          </div>
        ) : !allPuzzlesSolved && currentAnchor ? (
          <div className="bg-slate-950/88 backdrop-blur-md border border-slate-800/90 text-slate-200 px-4 py-1.5 rounded-xl shadow-lg flex items-center gap-2 text-xs max-w-2xl text-center">
            {isCurrentAnchorDiscovered ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  <strong className="text-sky-300">Clue Discovered:</strong> Find its counterpart in the real room &amp; show the object to the camera.
                </span>
              </>
            ) : (
              <>
                <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-amber-300">Current Objective:</strong>{' '}
                  {currentAnchor.directionalObjective}
                </span>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Proximity-Based 3D Interaction Prompt ("Press E to Investigate") */}
      {proximityTarget && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto">
          <button
            onClick={() => {
              if (proximityTarget.type === 'exit_door') {
                onOpenExitDoor();
              } else if (proximityTarget.puzzleId) {
                onOpenPuzzle(proximityTarget.puzzleId);
              }
            }}
            className="group flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-950/92 backdrop-blur-xl border border-amber-400/60 shadow-[0_0_25px_rgba(245,158,11,0.28)] hover:border-amber-300 hover:bg-slate-900/95 transition-all cursor-pointer"
          >
            <span className="w-7 h-7 rounded-lg bg-amber-500/25 border border-amber-400 text-amber-200 font-mono text-xs font-bold flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              E
            </span>
            <div className="text-left">
              <div className="text-xs font-semibold text-amber-100 flex items-center gap-1.5">
                {proximityTarget.type === 'exit_door' ? (
                  <>
                    <DoorOpen className="w-3.5 h-3.5 text-amber-300" />
                    <span>
                      {isDoorUnlocked
                        ? 'Press E to View Escape Summary'
                        : allPuzzlesSolved
                        ? 'Press E to Enter Banishing Code at Exit Door'
                        : 'Press E to Inspect Locked Exit Door'}
                    </span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5 text-amber-300" />
                    <span>Press E to Investigate</span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-slate-400">
                {proximityTarget.anchorTitle || proximityTarget.anchorName} (
                {proximityTarget.distance.toFixed(1)}m)
              </div>
            </div>
          </button>
        </div>
      )}
    </>
  );
};
