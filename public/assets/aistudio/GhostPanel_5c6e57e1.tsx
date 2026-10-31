/**
 * Haunted Room - Stage 4 UI: webcam, ghost captions, code digits, and organiser backup buttons.
 * Usage: <GhostPanel game={result.game} objects={result.usable_objects} onState={setGameState} />
 * onState lets your partner's 3D scene react (current puzzle, hint level, escaped).
 */
import { useEffect, useRef, useState } from 'react';
import { GhostSession } from './ghostLive';
import { initialState, type GameState } from './gameState';
import type { Game, RoomObject } from './gameGenerator';

export default function GhostPanel({ game, objects, onState }: {
  game: Game;
  objects: RoomObject[];
  onState?: (s: GameState) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ghost = useRef<GhostSession | null>(null);
  const [state, setState] = useState<GameState>(initialState());
  const [status, setStatus] = useState('Ready');
  const [lines, setLines] = useState<{ who: string; text: string }[]>([]);

  const createSession = () => {
    if (!videoRef.current) return null;
    const session = new GhostSession(game, objects, {
      onState: (s) => { setState(s); onState?.(s); },
      onStatus: setStatus,
      onTranscript: (who, text) =>
        setLines((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.who === who) return [...prev.slice(0, -1), { who, text: last.text + text }];
          return [...prev.slice(-12), { who, text }];
        }),
    }, videoRef.current);
    ghost.current = session;
    return session;
  };

  useEffect(() => {
    const initial = initialState();
    setState(initial);
    onState?.(initial);
    createSession();
    return () => ghost.current?.stop();
  }, [game, objects]);

  const start = async () => {
    ghost.current?.stop();
    const session = createSession();
    if (!session) return;
    try { await session.start(); } catch (e: any) { setStatus('Failed: ' + e.message); }
  };

  const current = game.puzzles[state.index];

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-black text-orange-100 rounded-xl">
      <div>
        <video ref={videoRef} muted playsInline className="w-full rounded-lg border border-orange-700" />
        <div className="mt-2 text-sm opacity-70">{status}</div>
        <div className="mt-2 flex gap-2">
          <button onClick={start} className="px-3 py-1 bg-orange-600 rounded cursor-pointer">👻 Summon the ghost</button>
          <button onClick={() => ghost.current?.stop()} className="px-3 py-1 bg-gray-700 rounded cursor-pointer">Stop</button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Door code: digits appear as puzzles are solved */}
        <div className="flex gap-2 text-4xl font-mono">
          {game.puzzles.map((_, i) => (
            <span key={i} className={`w-12 h-14 flex items-center justify-center rounded border ${state.digits[i] ? 'border-green-400 text-green-300' : 'border-orange-800 text-orange-900'}`}>
              {state.digits[i] ?? '?'}
            </span>
          ))}
        </div>

        <div className="text-sm">
          {state.escaped ? '🎉 ESCAPED!' : state.allSolved ? 'Speak the door code to escape' : `Puzzle ${state.index + 1}/${game.puzzles.length} · hint level ${state.hintLevel}`}
        </div>

        {/* Captions */}
        <div className="h-48 overflow-y-auto bg-zinc-900 rounded p-2 text-sm space-y-1">
          {lines.map((l, i) => (
            <div key={i} className={l.who === 'ghost' ? 'text-orange-300' : 'text-zinc-300'}>
              {l.who === 'ghost' ? '👻 ' : '🧑 '}{l.text}
            </div>
          ))}
        </div>

        {/* Organiser backup: if the camera misreads, a human can confirm (human in control) */}
        {!state.allSolved && current && (
          <details className="text-xs opacity-70">
            <summary className="cursor-pointer">Organiser override</summary>
            <div className="flex flex-wrap gap-1 mt-1">
              {objects.map((o) => (
                <button key={o.id} onClick={() => (ghost.current ?? createSession())?.forceObject(o.id)} className="px-2 py-0.5 bg-zinc-800 rounded cursor-pointer">
                  {o.name}
                </button>
              ))}
            </div>
          </details>
        )}
        <div className="text-xs opacity-50">{state.lastEvent}</div>
      </div>
    </div>
  );
}
