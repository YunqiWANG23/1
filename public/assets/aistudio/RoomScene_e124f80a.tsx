import React from 'react';
import { Sparkles, KeyRound, Lock, Unlock, Compass, MapPin } from 'lucide-react';
import type { Game, RoomObject } from '../../gameGenerator';
import type { GameState } from '../../gameState';

export function RoomScene({
  game,
  objects,
  state,
}: {
  game: Game;
  objects: RoomObject[];
  state: GameState;
}) {
  const currentPuzzle = game.puzzles[state.index];
  const solvedTargets = new Set(
    game.puzzles.slice(0, state.index).map((p) => p.target)
  );

  return (
    <div
      aria-label="3D Room Scene Stage"
      data-testid="room-scene-3d"
      data-state={state.escaped ? 'escaped' : state.allSolved ? 'code-ready' : 'playing'}
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between gap-4"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-orange-400" />
          <h3 className="text-sm font-bold text-white">
            3D Room Scene (Synced via <code>onState</code>)
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {state.escaped ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500 text-zinc-950">
              <Unlock className="w-3.5 h-3.5" />
              DOOR UNLOCKED
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-mono bg-orange-500/20 text-orange-300 border border-orange-500/40">
              <Lock className="w-3.5 h-3.5" />
              Puzzle {Math.min(state.index + 1, game.puzzles.length)}/
              {game.puzzles.length} · Hint Lv.{state.hintLevel}
            </span>
          )}
        </div>
      </div>

      {/* Isometric / Perspective Room Stage */}
      <div className="relative h-56 rounded-xl bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800 overflow-hidden p-4 flex flex-col justify-between">
        {/* Room Exit Door & Code Lock */}
        <div className="flex items-center justify-between z-10">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-xs text-zinc-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {state.escaped
                ? game.outro
                : currentPuzzle
                ? `Active Clue (${currentPuzzle.id}): "${currentPuzzle.clue}"`
                : 'All objects found! Speak the 4-digit code to unlock the exit door.'}
            </span>
          </div>

          <div
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold flex items-center gap-1.5 shrink-0 ${
              state.escaped
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-zinc-900/90 border-orange-500/40 text-amber-300'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>
              {game.puzzles
                .map((_, idx) => state.digits[idx] ?? '•')
                .join(' ')}
            </span>
          </div>
        </div>

        {/* Spatial Object Markers in Room */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 z-10 my-auto">
          {objects.map((obj) => {
            const isSolved = solvedTargets.has(obj.id);
            const isCurrentTarget =
              !state.allSolved && currentPuzzle?.target === obj.id;
            const showHintPulse = isCurrentTarget && state.hintLevel > 0;

            return (
              <div
                key={obj.id}
                className={`rounded-lg p-2.5 border text-xs transition flex items-start gap-2 ${
                  isSolved
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : showHintPulse
                    ? 'bg-amber-950/50 border-amber-400 text-amber-200 animate-pulse'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-300'
                }`}
              >
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                    isSolved
                      ? 'text-emerald-400'
                      : showHintPulse
                      ? 'text-amber-400'
                      : 'text-orange-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{obj.name}</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {obj.location}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Telemetry Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-2 z-10">
          <span>lastEvent: {state.lastEvent}</span>
          <span>
            wrongTries: {state.wrongTries} · hintLevel: {state.hintLevel}
          </span>
        </div>
      </div>
    </div>
  );
}
