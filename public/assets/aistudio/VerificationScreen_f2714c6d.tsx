import React, { useState } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Wrench,
  Play,
  Bug,
  Loader2,
  ArrowRight,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import {
  PERSONAS,
  computeRoundDiffs,
  type VerifyAndFixResponse,
  type RoomObject,
} from '../utils/escapeData';

interface VerificationScreenProps {
  verifyData: VerifyAndFixResponse;
  usableObjects: RoomObject[];
  demoMode: boolean;
  onToggleDemoMode: (val: boolean) => void;
  onLoadBrokenDemo: () => Promise<void>;
  onVerifyCurrentGame: () => Promise<void>;
  isVerifying: boolean;
  verifyError: string | null;
  onApprove?: () => void;
}

export function VerificationScreen({
  verifyData,
  usableObjects,
  demoMode,
  onToggleDemoMode,
  onLoadBrokenDemo,
  onVerifyCurrentGame,
  isVerifying,
  verifyError,
  onApprove,
}: VerificationScreenProps) {
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number>(0);
  const [gameApproved, setGameApproved] = useState<boolean>(false);

  // Keep selectedRoundIndex in bounds when history changes
  const safeIndex =
    selectedRoundIndex < verifyData.history.length ? selectedRoundIndex : 0;
  const activeRound =
    verifyData.history[safeIndex] ?? verifyData.history[0];

  const ruleCheckPassed = activeRound?.report.rule_check.passed ?? false;
  const playtestPassed =
    (activeRound?.report.playtest ?? []).every(
      (pt) => pt.verdict === 'clear' || pt.verdict === 'ok'
    ) &&
    (activeRound?.report.playtest ?? []).every((pt) => !pt.problem);

  // Collect UNESCAPABLE problems from the active round (or any round in history so they are never hidden)
  const activeUnescapableProblems = (
    activeRound?.report.problems ?? []
  ).filter((p) => p.toUpperCase().includes('UNESCAPABLE'));

  const allUnescapableProblems = Array.from(
    new Set(
      verifyData.history.flatMap((h) =>
        h.report.problems.filter((p) => p.toUpperCase().includes('UNESCAPABLE'))
      )
    )
  );

  const unescapableToShow =
    activeUnescapableProblems.length > 0
      ? activeUnescapableProblems
      : allUnescapableProblems;

  const roundDiffs = computeRoundDiffs(verifyData.history);

  const objectNameMap = new Map(usableObjects.map((o) => [o.id, o.name]));

  const handleBrokenClick = async () => {
    setGameApproved(false);
    setSelectedRoundIndex(0);
    await onLoadBrokenDemo();
  };

  const handleVerifyCurrentClick = async () => {
    setGameApproved(false);
    setSelectedRoundIndex(0);
    await onVerifyCurrentGame();
  };

  return (
    <section aria-label="Verification Screen" className="space-y-6">
      {/* Verification Control Bar */}
      <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold uppercase bg-orange-500/20 text-orange-300 border border-orange-500/40">
              Stage 2
            </span>
            <h2 className="text-lg font-bold text-white">
              Verification &amp; AI Playtester Loop
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Layer 1: Deterministic Rule Check · Layer 2: 3 Persona Playtesters (
            <code>gemini-3.8-flash</code>) · Auto-Fix Loop (
            <code>gemini-4-argon</code>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Demo mode (offline) toggle */}
          <label
            htmlFor="demo-mode-offline-toggle"
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-700 text-xs font-medium text-zinc-200 cursor-pointer select-none"
          >
            <input
              id="demo-mode-offline-toggle"
              type="checkbox"
              checked={demoMode}
              onChange={(e) => onToggleDemoMode(e.target.checked)}
              className="rounded border-zinc-600 bg-zinc-900 text-orange-500 focus:ring-orange-500"
            />
            <span>Demo mode (offline)</span>
            <code className="text-[11px] font-mono text-orange-300">
              mock: {String(demoMode)}
            </code>
          </label>

          {/* Load broken demo level button */}
          <button
            type="button"
            onClick={handleBrokenClick}
            disabled={isVerifying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white shadow-lg shadow-rose-600/20 transition cursor-pointer"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Bug className="w-4 h-4" />
            )}
            <span>Load broken demo level</span>
          </button>

          {/* Verify current game button */}
          <button
            type="button"
            onClick={handleVerifyCurrentClick}
            disabled={isVerifying}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-60 text-zinc-100 border border-zinc-700 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span>Re-verify Current Game</span>
          </button>
        </div>
      </div>

      {verifyError && (
        <div
          role="alert"
          className="rounded-xl bg-rose-950/70 border border-rose-700 p-4 text-sm text-rose-200"
        >
          {verifyError}
        </div>
      )}

      {/* Round Switcher Bar when multiple rounds exist */}
      {verifyData.history.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
          <div className="text-xs text-zinc-300">
            Inspecting verification round for Checklist &amp; Playtester Cards:
          </div>
          <div className="flex items-center gap-2" role="tablist" aria-label="Verification rounds">
            {verifyData.history.map((h, idx) => {
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={h.round}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setSelectedRoundIndex(idx)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                    isSelected
                      ? h.report.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      h.report.passed ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                  />
                  <span>
                    Round {h.round} ({h.report.passed ? 'PASSED' : 'FAILED'})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Three-Column Verification Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: Checklist (Rule Check & Playtest Status Lights + Large Red UNESCAPABLE Text) */}
        <div
          aria-label="Column 1: Verification Checklist"
          className="lg:col-span-3 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-5"
        >
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                1. Checklist
              </h3>
              <p className="text-xs text-zinc-400">
                Round {activeRound.round} Safety &amp; Playability Lights
              </p>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              code: {activeRound.game.final_code}
            </span>
          </div>

          {/* Red / Green Traffic Lights */}
          <div className="space-y-3">
            {/* Light 1: Rule Check */}
            <div
              className={`rounded-xl p-3.5 border flex items-center justify-between ${
                ruleCheckPassed
                  ? 'bg-emerald-950/30 border-emerald-700/60'
                  : 'bg-red-950/40 border-red-700/70'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">
                  Layer 1: Rule Check
                </div>
                <div className="text-[11px] text-zinc-400">
                  Targets, clues &amp; door code math
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-label={
                    ruleCheckPassed ? 'Rule check green light' : 'Rule check red light'
                  }
                  className={`w-4 h-4 rounded-full shadow-md ${
                    ruleCheckPassed
                      ? 'bg-emerald-400 shadow-emerald-400/50'
                      : 'bg-red-500 shadow-red-500/60 animate-pulse'
                  }`}
                />
                <span
                  className={`text-xs font-mono font-bold ${
                    ruleCheckPassed ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {ruleCheckPassed ? 'GREEN' : 'RED'}
                </span>
              </div>
            </div>

            {/* Light 2: AI Playtest Status */}
            <div
              className={`rounded-xl p-3.5 border flex items-center justify-between ${
                playtestPassed
                  ? 'bg-emerald-950/30 border-emerald-700/60'
                  : 'bg-red-950/40 border-red-700/70'
              }`}
            >
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">
                  Layer 2: Playtest Status
                </div>
                <div className="text-[11px] text-zinc-400">
                  3 AI Personas x {activeRound.game.puzzles.length} Puzzles
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  aria-label={
                    playtestPassed
                      ? 'Playtest status green light'
                      : 'Playtest status red light'
                  }
                  className={`w-4 h-4 rounded-full shadow-md ${
                    playtestPassed
                      ? 'bg-emerald-400 shadow-emerald-400/50'
                      : 'bg-red-500 shadow-red-500/60 animate-pulse'
                  }`}
                />
                <span
                  className={`text-xs font-mono font-bold ${
                    playtestPassed ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {playtestPassed ? 'GREEN' : 'RED'}
                </span>
              </div>
            </div>
          </div>

          {/* UNESCAPABLE Problems in Large Red Text */}
          {unescapableToShow.length > 0 && (
            <div
              role="alert"
              className="rounded-xl bg-red-950/70 border-2 border-red-500 p-4 space-y-2 shadow-lg shadow-red-950/50"
            >
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <span>Critical Blocker Detected</span>
              </div>
              {unescapableToShow.map((prob, idx) => (
                <p
                  key={idx}
                  className="text-lg sm:text-xl font-extrabold text-red-400 leading-snug tracking-tight"
                >
                  {prob}
                </p>
              ))}
              {activeRound.report.passed && (
                <p className="text-xs text-emerald-300 pt-1 border-t border-red-800/60">
                  ✓ Caught in Round 1 and automatically repaired in Round{' '}
                  {activeRound.round}.
                </p>
              )}
            </div>
          )}

          {/* Other Checklist Problems for Active Round */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-zinc-300">
              Round {activeRound.round} Diagnostic Summary
            </div>
            {activeRound.report.problems.length === 0 ? (
              <div className="rounded-xl bg-emerald-950/25 border border-emerald-800/50 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>0 problems in Round {activeRound.round}. All checks pass!</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {activeRound.report.problems.map((prob, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-zinc-950 border border-red-800/60 p-2.5 text-xs text-red-200 flex items-start gap-2"
                  >
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{prob}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* COLUMN 2: Playtester Cards (One row per puzzle, 3 persona avatars with green/red border) */}
        <div
          aria-label="Column 2: Playtester Cards"
          className="lg:col-span-5 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4"
        >
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                2. Playtester Cards (Round {activeRound.round})
              </h3>
              <p className="text-xs text-zinc-400">
                One row per puzzle · 3 personas guess from clue alone (green =
                correct, red = wrong)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {activeRound.report.playtest.map((pt) => {
              const puzzleObj = activeRound.game.puzzles.find(
                (p) => p.id === pt.puzzle_id
              );
              const targetName = objectNameMap.get(pt.target) ?? pt.target;

              return (
                <div
                  key={pt.puzzle_id}
                  className="rounded-xl bg-zinc-950/90 border border-zinc-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
                        {pt.puzzle_id.toUpperCase()}
                      </span>
                      <span className="text-xs text-zinc-300">
                        Target:{' '}
                        <code className="text-emerald-400 font-mono font-semibold">
                          {pt.target}
                        </code>{' '}
                        ({targetName})
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                        pt.verdict === 'clear' || pt.verdict === 'ok'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {pt.verdict} ({pt.correct_count}/3)
                    </span>
                  </div>

                  {puzzleObj && (
                    <p className="text-xs text-zinc-300 italic bg-zinc-900/90 px-3 py-2 rounded-lg border border-zinc-800">
                      “{puzzleObj.clue}”
                    </p>
                  )}

                  {/* Three Persona Avatars Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {pt.guesses.map((guess) => {
                      const personaInfo = PERSONAS.find(
                        (p) => p.id === guess.persona
                      ) ?? {
                        id: guess.persona,
                        label: guess.persona,
                        emoji: '🧑',
                      };
                      const guessedName =
                        objectNameMap.get(guess.guess_id) ?? guess.guess_id;

                      return (
                        <div
                          key={guess.persona}
                          className={`rounded-xl p-3 border-2 flex flex-col justify-between gap-2 transition ${
                            guess.correct
                              ? 'border-emerald-500 bg-emerald-950/25'
                              : 'border-red-500 bg-red-950/30'
                          }`}
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-lg leading-none"
                                  role="img"
                                  aria-label={personaInfo.label}
                                >
                                  {personaInfo.emoji}
                                </span>
                                <span className="text-xs font-bold text-white leading-tight">
                                  {personaInfo.label}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  guess.correct
                                    ? 'bg-emerald-500 text-zinc-950'
                                    : 'bg-red-500 text-white'
                                }`}
                              >
                                {guess.correct ? '✓' : '✗'}
                              </span>
                            </div>

                            <div className="text-xs">
                              <span className="text-zinc-400">Guess: </span>
                              <code
                                className={`font-mono font-semibold ${
                                  guess.correct
                                    ? 'text-emerald-300'
                                    : 'text-red-300'
                                }`}
                              >
                                {guessedName}
                              </code>
                            </div>
                          </div>

                          <p className="text-[11px] text-zinc-300 leading-snug border-t border-zinc-800/80 pt-1.5">
                            {guess.reasoning}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* COLUMN 3: Fix History (Problems per round, Before/After Diff, Organiser Approve Button) */}
        <div
          aria-label="Column 3: Fix History"
          className="lg:col-span-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-5"
        >
          <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-200">
                3. Fix History &amp; Approval
              </h3>
              <p className="text-xs text-zinc-400">
                {verifyData.history.length} verification round
                {verifyData.history.length === 1 ? '' : 's'} recorded
              </p>
            </div>
            <Wrench className="w-4 h-4 text-orange-400" />
          </div>

          {/* Per-round timeline */}
          <div className="space-y-3">
            {verifyData.history.map((h) => (
              <div
                key={h.round}
                className={`rounded-xl p-3.5 border space-y-2 ${
                  h.report.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-rose-950/25 border-rose-800/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Round {h.round}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                      h.report.passed
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-rose-500 text-white'
                    }`}
                  >
                    {h.report.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                {h.report.problems.length === 0 ? (
                  <p className="text-xs text-emerald-300">
                    All rule checks and persona playtests passed.
                  </p>
                ) : (
                  <ul className="list-disc list-inside text-xs text-rose-200 space-y-1">
                    {h.report.problems.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Before / After Diffs of Changed Clues and final_code */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Before / After Diff (Argon Auto-Fix)
            </h4>

            {roundDiffs.length === 0 ? (
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 text-xs text-zinc-400">
                Passed on Round 1 — no clue or <code>final_code</code> rewrites
                needed. Click{' '}
                <strong className="text-rose-300">Load broken demo level</strong>{' '}
                above to see Argon automatically repair a broken escape game!
              </div>
            ) : (
              roundDiffs.map((diff) => (
                <div
                  key={`${diff.fromRound}-${diff.toRound}`}
                  className="rounded-xl bg-zinc-950 border border-zinc-800 p-3.5 space-y-3"
                >
                  <div className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
                    <span>Round {diff.fromRound}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Round {diff.toRound} Changes</span>
                  </div>

                  {diff.finalCodeDiff && (
                    <div className="space-y-1.5 text-xs">
                      <div className="font-mono text-zinc-400">
                        final_code diff:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-red-950/50 border border-red-800/70 p-2 font-mono text-red-300">
                          <span className="block text-[10px] uppercase text-red-400">
                            Before
                          </span>
                          <del className="font-bold text-sm">
                            {diff.finalCodeDiff.before}
                          </del>
                        </div>
                        <div className="rounded-lg bg-emerald-950/50 border border-emerald-800/70 p-2 font-mono text-emerald-300">
                          <span className="block text-[10px] uppercase text-emerald-400">
                            After
                          </span>
                          <ins className="no-underline font-bold text-sm">
                            {diff.finalCodeDiff.after}
                          </ins>
                        </div>
                      </div>
                    </div>
                  )}

                  {diff.clueDiffs.map((cd) => (
                    <div key={cd.puzzle_id} className="space-y-1.5 text-xs">
                      <div className="font-mono text-zinc-400">
                        Puzzle <code>{cd.puzzle_id}</code> clue diff:
                      </div>
                      <div className="rounded-lg bg-red-950/40 border border-red-800/60 p-2.5 text-red-200">
                        <span className="block text-[10px] font-bold uppercase text-red-400 mb-0.5">
                          − Before (Round {diff.fromRound})
                        </span>
                        <span className="line-through opacity-90">
                          “{cd.before_clue}”
                        </span>
                      </div>
                      <div className="rounded-lg bg-emerald-950/40 border border-emerald-800/60 p-2.5 text-emerald-200">
                        <span className="block text-[10px] font-bold uppercase text-emerald-400 mb-0.5">
                          + After (Round {diff.toRound})
                        </span>
                        <span>“{cd.after_clue}”</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Organiser: approve & start game button (ONLY appears when passed is true) */}
          {verifyData.passed && (
            <div className="pt-2 border-t border-zinc-800 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setGameApproved(true);
                  onApprove?.();
                }}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Organiser: approve &amp; start game</span>
              </button>

              {gameApproved && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-950/60 border border-emerald-500/60 p-3.5 text-xs text-emerald-200 space-y-1"
                >
                  <div className="font-bold text-emerald-300 flex items-center justify-between">
                    <span>✓ Game Approved &amp; Live!</span>
                    <span className="font-mono flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5" />
                      {verifyData.final_game.final_code}
                    </span>
                  </div>
                  <p>
                    “{verifyData.final_game.title}” is now active for players with
                    verified clues and unlock code{' '}
                    <code className="font-mono font-bold">
                      {verifyData.final_game.final_code}
                    </code>
                    .
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
