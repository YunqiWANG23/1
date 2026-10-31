/**
 * Haunted Room - Stage 4 UI: webcam, ghost captions, code digits, hints, door code entry,
 * and organiser/offline demo controls.
 *
 * Spatial Investigation Redesign:
 * - Before the player discovers the current puzzle's Clue Anchor in the 3D scene (`Press E`),
 *   only the non-spoiler Directional Exploration Objective is shown.
 * - Once discovered in 3D, the Ghost narrates the full clue, shows the parallel-world
 *   spatial reasoning hint, and unlocks real-world camera verification.
 * - Never reveals real-world target object IDs or names in normal player mode.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GhostSession } from './ghostLive';
import { initialState, type GameState } from './gameState';
import type { Game, RoomObject } from './gameGenerator';
import type { ResolvedClueAnchor } from './utils/interactionSystem';
import {
  Sparkles,
  HelpCircle,
  KeyRound,
  Video,
  Square,
  CheckCircle2,
  XCircle,
  Unlock,
  Compass,
  Lock,
  Camera,
  SlidersHorizontal,
} from 'lucide-react';

export interface GhostPanelProps {
  game: Game;
  objects: RoomObject[];
  onState?: (s: GameState) => void;
  externalState?: GameState;
  demoMode?: boolean;
  discoveredClueIds?: Set<string>;
  resolvedAnchors?: Map<string, ResolvedClueAnchor>;
  isDevMode?: boolean;
  onFocusObjectIn3D?: (objectId: string) => void;
  onOpenCameraVerifyModal?: () => void;
  onDiscoverCurrentClueInDev?: (puzzleId: string) => void;
}

export default function GhostPanel({
  game,
  objects,
  onState,
  externalState,
  demoMode = false,
  discoveredClueIds = new Set(),
  resolvedAnchors,
  isDevMode = false,
  onFocusObjectIn3D,
  onOpenCameraVerifyModal,
  onDiscoverCurrentClueInDev,
}: GhostPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ghost = useRef<GhostSession | null>(null);
  const [state, setState] = useState<GameState>(externalState ?? initialState());
  const [status, setStatus] = useState(
    demoMode ? 'Offline Demo Mode Ready' : 'Ready to summon Live Ghost'
  );
  const [lines, setLines] = useState<{ who: string; text: string }[]>([]);
  const [codeAttempt, setCodeAttempt] = useState('');

  const current = game.puzzles[state.index];
  const currentAnchor = current ? resolvedAnchors?.get(current.id) : undefined;
  const isCurrentClueDiscovered = current
    ? discoveredClueIds.has(current.id)
    : false;

  const createSession = () => {
    if (!videoRef.current) return null;
    const session = new GhostSession(
      game,
      objects,
      {
        onState: (s) => {
          setState(s);
          onState?.(s);
        },
        onStatus: setStatus,
        onTranscript: (who, text) =>
          setLines((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.who === who && !demoMode) {
              return [
                ...prev.slice(0, -1),
                { who, text: last.text + text },
              ];
            }
            return [...prev.slice(-14), { who, text }];
          }),
      },
      videoRef.current,
      demoMode
    );
    session.syncDiscoveredClues(discoveredClueIds);
    ghost.current = session;
    return session;
  };

  useEffect(() => {
    const initial = initialState();
    setState(initial);
    onState?.(initial);
    const firstPuzzle = game.puzzles[0];
    const firstAnchor = firstPuzzle
      ? resolvedAnchors?.get(firstPuzzle.id)
      : undefined;
    const introPrompt = firstAnchor
      ? `${game.intro} Explore the 3D castle with WASD: ${firstAnchor.directionalObjective}`
      : `${game.intro} Explore the 3D castle with WASD and press E at the first Clue Anchor to uncover the first riddle.`;
    setLines([
      {
        who: 'ghost',
        text: introPrompt,
      },
    ]);
    createSession();
    return () => ghost.current?.stop();
  }, [game, objects, demoMode]);

  // Keep internal state synced if 3D scene updates the shared GameState in App.tsx
  useEffect(() => {
    if (externalState) {
      setState(externalState);
      ghost.current?.syncExternalState(externalState);
    }
  }, [externalState]);

  // Sync discovered clues from 3D exploration and trigger Ghost narration when a new clue is uncovered!
  useEffect(() => {
    const session = ghost.current ?? createSession();
    if (!session) return;
    session.syncDiscoveredClues(discoveredClueIds);

    if (current && discoveredClueIds.has(current.id)) {
      const anchor = resolvedAnchors?.get(current.id);
      session.notifyClueDiscovered(
        current.id,
        current.clue,
        anchor?.anchorTitle,
        anchor?.spatialReasoningHint
      );
    }
  }, [discoveredClueIds, current?.id]);

  const start = async () => {
    ghost.current?.stop();
    const session = createSession();
    if (!session) return;
    try {
      await session.start(currentAnchor?.directionalObjective);
    } catch (e: any) {
      setStatus('Failed: ' + e.message);
    }
  };

  const handleRequestHint = () => {
    const session = ghost.current ?? createSession();
    session?.requestGhostHint();
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codeToTry = codeAttempt.trim() || state.digits.join('');
    if (!codeToTry) return;
    const session = ghost.current ?? createSession();
    session?.submitDoorCode(codeToTry);
  };

  const activeHintText =
    current && state.hintLevel > 0
      ? current.hints[Math.min(state.hintLevel - 1, current.hints.length - 1)]
      : null;

  // Find a wrong object for quick demo simulation
  const wrongDemoObject =
    objects.find((o) => current && o.id !== current.target) ?? objects[0];

  return (
    <div className="flex flex-col gap-3 p-3.5 bg-zinc-950/95 text-orange-100 rounded-2xl border border-amber-500/30 shadow-2xl">
      {/* Header & Mode Badge */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="text-sm font-bold tracking-wide text-amber-100">
            Ghost Guide &amp; Reality Bridge
          </h3>
        </div>
        {demoMode ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
            Offline Voice
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Gemini Live
          </span>
        )}
      </div>

      {/* Webcam & Summon Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
        <div className="sm:col-span-6 relative rounded-xl overflow-hidden bg-black border border-amber-700/50 aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[10px] bg-black/75 px-2 py-0.5 rounded text-amber-200/90 truncate">
            <span className="truncate">{status}</span>
          </div>
        </div>

        <div className="sm:col-span-6 flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={start}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-md"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{demoMode ? '👻 Summon Guide' : '👻 Summon Live Ghost'}</span>
            </button>
            <button
              type="button"
              onClick={() => ghost.current?.stop()}
              className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 transition cursor-pointer"
              title="Disconnect Ghost Audio/Video"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Door code slots */}
          <div className="flex items-center justify-between gap-1.5 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              Code:
            </span>
            <div className="flex gap-1.5 font-mono text-base font-bold">
              {game.puzzles.map((_, i) => (
                <span
                  key={i}
                  className={`w-7 h-8 flex items-center justify-center rounded-lg border ${
                    state.digits[i]
                      ? 'border-emerald-400 bg-emerald-950/60 text-emerald-300 shadow-sm shadow-emerald-500/30'
                      : i === state.index && !state.allSolved
                      ? 'border-amber-500/70 bg-amber-950/30 text-amber-300'
                      : 'border-zinc-800 bg-zinc-950 text-zinc-600'
                  }`}
                >
                  {state.digits[i] ?? '?'}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Stage-Gated Investigation Card:
          1) Before 3D Clue Anchor is discovered -> Show ONLY directional objective
          2) After 3D Clue Anchor is discovered -> Show full riddle + parallel-world reasoning + camera verification */}
      {!state.escaped && current && !state.allSolved && (
        <div className="rounded-xl bg-zinc-900/90 border border-amber-500/30 p-3 space-y-2.5">
          {!isCurrentClueDiscovered ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  <Compass className="w-3.5 h-3.5" />
                  Step 1: Explore the 3D Room (Seal {state.index + 1}/
                  {game.puzzles.length})
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400 border border-zinc-700">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Clue Locked
                </span>
              </div>

              <div className="rounded-lg bg-amber-950/30 border border-amber-500/30 p-2.5 text-xs text-amber-100 leading-relaxed">
                <div className="font-semibold text-amber-300 mb-0.5">
                  {currentAnchor?.anchorTitle || 'Locate the Clue Anchor in 3D'}
                </div>
                <p className="text-zinc-200">
                  {currentAnchor?.directionalObjective ||
                    'Walk through the 3D castle with WASD and press E when "Press E to Investigate" appears.'}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400">
                <span>
                  Walk up to the glowing artifact in the 3D world and press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-300 font-mono font-bold">
                    E
                  </kbd>{' '}
                  to read the inscription.
                </span>
                {isDevMode && onDiscoverCurrentClueInDev && (
                  <button
                    type="button"
                    onClick={() => onDiscoverCurrentClueInDev(current.id)}
                    className="shrink-0 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[10px] font-mono text-amber-300 border border-amber-500/40 cursor-pointer"
                  >
                    [Dev] Reveal Clue
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                  Step 2: Discovered Inscription ({current.id.toUpperCase()})
                </span>
                <div className="flex items-center gap-1.5">
                  {isDevMode && onFocusObjectIn3D && (
                    <button
                      type="button"
                      onClick={() => onFocusObjectIn3D(current.target)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-amber-300 border border-zinc-700 cursor-pointer"
                      title="Developer Mode: Focus camera on target object"
                    >
                      <Compass className="w-3 h-3" />
                      <span>[Dev] Focus Target</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRequestHint}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-[11px] font-semibold text-amber-300 border border-amber-500/40 cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>
                      Hint ({state.hintLevel}/{current.hints.length})
                    </span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-zinc-100 italic leading-relaxed bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800">
                “{current.clue}”
              </p>

              {currentAnchor?.spatialReasoningHint && (
                <div className="rounded-lg bg-indigo-950/35 border border-indigo-500/30 px-2.5 py-2 text-[11px] text-indigo-200 leading-relaxed">
                  {currentAnchor.spatialReasoningHint}
                </div>
              )}

              {activeHintText && (
                <div className="rounded-lg bg-amber-950/40 border border-amber-700/50 px-2.5 py-1.5 text-xs text-amber-200">
                  <span className="font-bold">Hint {state.hintLevel}:</span>{' '}
                  {activeHintText}
                </div>
              )}

              <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-amber-200/90 font-medium">
                  Find its counterpart in the real room &amp; show it to the camera:
                </span>
                {onOpenCameraVerifyModal && (
                  <button
                    type="button"
                    onClick={onOpenCameraVerifyModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition cursor-pointer shadow"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Show Object to Camera</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Final Door Code Input when all puzzles are solved */}
      {state.allSolved && !state.escaped && (
        <form
          onSubmit={handleCodeSubmit}
          className="rounded-xl bg-emerald-950/30 border border-emerald-500/50 p-3 space-y-2"
        >
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5" />
            <span>All 4 Digits Collected! Unbar the Fortress Exit Doors:</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeAttempt}
              onChange={(e) => setCodeAttempt(e.target.value)}
              placeholder={`Enter ${state.digits.join('') || '4-digit code'}`}
              className="flex-1 rounded-lg bg-zinc-950 border border-emerald-700/60 px-3 py-1.5 text-sm font-mono text-white focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Unlock Exit</span>
            </button>
          </div>
        </form>
      )}

      {/* Escape Outro Banner */}
      {state.escaped && (
        <div className="rounded-xl bg-emerald-950/50 border-2 border-emerald-500 p-3 text-xs text-emerald-100 space-y-1">
          <div className="font-bold text-emerald-300 uppercase tracking-wider">
            🎉 The Parallel Curse is Broken!
          </div>
          <p className="leading-relaxed">{game.outro}</p>
        </div>
      )}

      {/* Ghost & Player Transcript Captions */}
      <div className="h-28 overflow-y-auto bg-zinc-900/90 rounded-xl p-2.5 text-xs space-y-1.5 border border-zinc-800">
        {lines.map((l, i) => (
          <div
            key={i}
            className={
              l.who === 'ghost'
                ? 'text-amber-300 leading-relaxed'
                : 'text-zinc-300'
            }
          >
            {l.who === 'ghost' ? '👻 ' : '🧑 '}
            {l.text}
          </div>
        ))}
      </div>

      {/* Collapsible Demo & Organiser Controls (keeps Player UI clean and spoiler-free!) */}
      {!state.allSolved && current && (
        <details className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 px-3 py-2 text-xs">
          <summary className="cursor-pointer font-mono text-[11px] text-zinc-400 hover:text-amber-300 flex items-center gap-1.5 select-none">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Simulation &amp; Organiser Controls</span>
          </summary>

          <div className="mt-2.5 space-y-2.5 pt-2 border-t border-zinc-800/80">
            {!isCurrentClueDiscovered ? (
              <div className="text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-500/30 rounded-lg p-2">
                Explore the 3D room and press <b>E</b> at the Clue Anchor first to unlock object verification.
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      (ghost.current ?? createSession())?.forceObject(
                        current.target
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Simulate Correct Real Object</span>
                  </button>
                  {wrongDemoObject && (
                    <button
                      type="button"
                      onClick={() =>
                        (ghost.current ?? createSession())?.forceObject(
                          wrongDemoObject.id
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-rose-100 text-xs font-semibold border border-rose-700/50 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Simulate Wrong Object</span>
                    </button>
                  )}
                </div>

                {isDevMode && (
                  <div>
                    <div className="text-[10px] font-mono uppercase text-zinc-400 mb-1">
                      Organiser Object Override (Dev Mode):
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {objects.map((o) => (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() =>
                            (ghost.current ?? createSession())?.forceObject(
                              o.id
                            )
                          }
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[11px] text-zinc-200 border border-zinc-700 cursor-pointer"
                        >
                          {o.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
