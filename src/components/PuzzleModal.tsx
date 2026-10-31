import React from 'react';
import {
  Camera,
  CheckCircle2,
  Compass,
  FlaskConical,
  HelpCircle,
  Lock,
  MapPin,
  Sparkles,
  X,
} from 'lucide-react';
import {
  EscapePuzzleItem,
  InventoryObjectItem,
  SolvedPuzzleRecord,
} from '../types/scene';
import { ResolvedClueAnchor } from '../utils/interactionSystem';

interface PuzzleModalProps {
  isOpen: boolean;
  puzzle: EscapePuzzleItem | null;
  puzzleIndex: number;
  allPuzzles: EscapePuzzleItem[];
  solvedPuzzles: Record<string, SolvedPuzzleRecord>;
  discoveredClueIds?: Set<string>;
  resolvedAnchors?: Map<string, ResolvedClueAnchor>;
  revealedHintCount: number;
  anchorName?: string;
  isDevMode: boolean;
  expectedTargetObject?: InventoryObjectItem;
  onClose: () => void;
  onSelectPuzzle: (puzzleId: string) => void;
  onRevealHint: () => void;
  onOpenCameraVerify: () => void;
  onDevSimulateSolve: (puzzleId: string) => void;
  onDevDiscoverClue?: (puzzleId: string) => void;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export const PuzzleModal: React.FC<PuzzleModalProps> = ({
  isOpen,
  puzzle,
  puzzleIndex,
  allPuzzles,
  solvedPuzzles,
  discoveredClueIds = new Set(),
  resolvedAnchors,
  revealedHintCount,
  anchorName,
  isDevMode,
  expectedTargetObject,
  onClose,
  onSelectPuzzle,
  onRevealHint,
  onOpenCameraVerify,
  onDevSimulateSolve,
  onDevDiscoverClue,
}) => {
  if (!isOpen || !puzzle) return null;

  const solvedRecord = solvedPuzzles[puzzle.id];
  const isSolved = Boolean(solvedRecord);
  const isDiscovered = isSolved || discoveredClueIds.has(puzzle.id);
  const anchor = resolvedAnchors?.get(puzzle.id);

  const hints = puzzle.hints || [];
  const visibleHints = hints.slice(0, revealedHintCount);
  const hasMoreHints = revealedHintCount < hints.length;
  const roman = ROMAN_NUMERALS[puzzleIndex] || String(puzzleIndex + 1);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md">
      <div className="relative w-full max-w-xl bg-slate-900/95 border border-amber-500/35 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden text-slate-100">
        {/* Top Riddle Selector Tabs */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {allPuzzles.map((p, idx) => {
              const pSolved = Boolean(solvedPuzzles[p.id]);
              const pDiscovered = pSolved || discoveredClueIds.has(p.id);
              const active = p.id === puzzle.id;
              const tabRoman = ROMAN_NUMERALS[idx] || String(idx + 1);
              return (
                <button
                  key={p.id}
                  onClick={() => onSelectPuzzle(p.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : pSolved
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                      : pDiscovered
                      ? 'bg-sky-950/50 border-sky-500/40 text-sky-300 hover:bg-sky-900/40'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Seal {tabRoman}</span>
                  {pSolved && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Clue Panel (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Clue Body */}
        <div className="p-6 space-y-5">
          {/* Header & Status Badge */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400/90">
                {isDiscovered
                  ? anchor?.anchorTitle ||
                    (anchorName
                      ? `Discovered at ${anchorName}`
                      : 'Spectral Inscription')
                  : '3D Spatial Investigation Required'}
              </div>
              <h2 className="text-xl font-bold text-slate-50 mt-0.5">
                Seal {roman} of{' '}
                {ROMAN_NUMERALS[allPuzzles.length - 1] || allPuzzles.length}
              </h2>
            </div>

            {isSolved ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Purified</span>
              </div>
            ) : isDiscovered ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 border border-sky-400/60 text-sky-200 text-xs font-semibold">
                <Compass className="w-3.5 h-3.5 text-sky-300" />
                <span>Clue Discovered</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold">
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span>Undiscovered in 3D</span>
              </div>
            )}
          </div>

          {!isDiscovered ? (
            /* UNDISCOVERED STATE: Force 3D Exploration before revealing the riddle! */
            <div className="space-y-4">
              <div className="p-5 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span>Explore the 3D Castle to Uncover This Clue</span>
                </div>
                <p className="text-sm text-slate-100 leading-relaxed font-medium">
                  {anchor?.directionalObjective ||
                    'Walk through the 3D Gothic hall using WASD and approach the active Clue Anchor.'}
                </p>
                <div className="text-xs text-slate-300 pt-1">
                  When you are close to{' '}
                  <strong className="text-amber-200">
                    {anchor?.anchorTitle || 'the Clue Anchor'}
                  </strong>
                  , press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/50 text-amber-300 font-mono font-bold">
                    E
                  </kbd>{' '}
                  to inspect the artifact and unlock its riddle.
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Continue 3D Exploration (WASD)
                </button>

                {isDevMode && onDevDiscoverClue && (
                  <button
                    onClick={() => onDevDiscoverClue(puzzle.id)}
                    className="px-3.5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-500 text-white text-xs font-mono font-semibold cursor-pointer"
                  >
                    [Dev] Unlock Clue Now
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* DISCOVERED STATE: Show full clue, parallel-world spatial context, hints, and camera verification */
            <>
              {/* Spectral Riddle Clue Box */}
              <div className="p-5 rounded-xl bg-slate-950/90 border border-amber-500/30 shadow-inner relative space-y-3">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400/80 mb-1.5">
                    Discovered Inscription
                  </div>
                  <p className="text-base leading-relaxed text-amber-50/95 font-serif italic">
                    “{puzzle.clue}”
                  </p>
                </div>

                {/* Parallel-World Spatial Reasoning Context */}
                {anchor?.spatialReasoningHint && (
                  <div className="pt-3 border-t border-slate-800/90 flex items-start gap-2.5 text-xs text-indigo-200/95 leading-relaxed">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{anchor.spatialReasoningHint}</span>
                  </div>
                )}
              </div>

              {/* Solved Reward Display (ONLY shown AFTER verification succeeds!) */}
              {isSolved && solvedRecord && (
                <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-400/50 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" />
                      <span>Curse Broken • Relic Purified in 3D</span>
                    </div>
                    {expectedTargetObject && (
                      <div className="text-xs text-slate-300">
                        Verified Real Object:{' '}
                        <span className="font-semibold text-white">
                          {expectedTargetObject.name}
                        </span>
                      </div>
                    )}
                    {solvedRecord.explanation && (
                      <p className="text-xs text-emerald-200/85">
                        {solvedRecord.explanation}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-500/25 border border-emerald-300">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-200">
                      Reward Digit
                    </span>
                    <span className="text-2xl font-mono font-bold text-white leading-tight">
                      {solvedRecord.rewardDigit}
                    </span>
                  </div>
                </div>
              )}

              {/* Progressive Hints Section (from game.puzzles[].hints) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                    Investigation Hints ({revealedHintCount}/{hints.length})
                  </span>
                  {hasMoreHints && (
                    <button
                      onClick={onRevealHint}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>
                        {revealedHintCount === 0
                          ? 'Need a Hint?'
                          : `Reveal Next Hint (${revealedHintCount + 1}/${hints.length})`}
                      </span>
                    </button>
                  )}
                </div>

                {visibleHints.length > 0 && (
                  <div className="space-y-2">
                    {visibleHints.map((hintText, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-950/75 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                          Hint {idx + 1}
                        </span>
                        <span>{hintText}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary Actions: Verify Real Object with Webcam */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Return to 3D Room
                </button>

                <button
                  onClick={onOpenCameraVerify}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>
                    {isSolved
                      ? 'Re-Verify Real Object'
                      : 'Show the Object to the Camera'}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Developer-Only Test Mode Bar (Hidden in normal player interface) */}
          {isDevMode && (
            <div className="mt-3 pt-3 border-t border-purple-500/30 bg-purple-950/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-purple-200 font-mono">
                <FlaskConical className="w-4 h-4 text-purple-400" />
                <span>
                  [DEV MODE] Target ID: <strong>{puzzle.target}</strong> • Digit:{' '}
                  <strong>{puzzle.reward_digit}</strong>
                </span>
              </div>
              <button
                onClick={() => onDevSimulateSolve(puzzle.id)}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
              >
                Simulate Verify Match
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
