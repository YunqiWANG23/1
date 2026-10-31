import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Delete,
  DoorOpen,
  KeyRound,
  Lock,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { EscapeGameData } from '../types/scene';
import { OrderedCodeSlot } from '../hooks/useEscapeGameState';
import { soundManager } from '../utils/audio';

interface ExitDoorModalProps {
  isOpen: boolean;
  gameData: EscapeGameData;
  orderedCodeSlots: OrderedCodeSlot[];
  solvedCount: number;
  totalPuzzles: number;
  allPuzzlesSolved: boolean;
  isDoorUnlocked: boolean;
  onClose: () => void;
  onSubmitCode: (code: string) => { success: boolean; message: string };
  onOpenPuzzle: (puzzleId: string) => void;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export const ExitDoorModal: React.FC<ExitDoorModalProps> = ({
  isOpen,
  gameData,
  orderedCodeSlots,
  solvedCount,
  totalPuzzles,
  allPuzzlesSolved,
  isDoorUnlocked,
  onClose,
  onSubmitCode,
  onOpenPuzzle,
}) => {
  const codeLength = Math.max(4, String(gameData.final_code || '4927').length);
  const [enteredCode, setEnteredCode] = useState('');
  const [feedback, setFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setEnteredCode('');
      setFeedback(null);
    }
  }, [isOpen]);

  const handleDigitPress = (digit: string) => {
    if (!allPuzzlesSolved || isDoorUnlocked) return;
    if (enteredCode.length >= codeLength) return;
    soundManager.playKeypadBeep(digit);
    setFeedback(null);
    setEnteredCode((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (!allPuzzlesSolved || isDoorUnlocked) return;
    soundManager.playClick();
    setFeedback(null);
    setEnteredCode((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (!allPuzzlesSolved || isDoorUnlocked) return;
    soundManager.playClick();
    setFeedback(null);
    setEnteredCode('');
  };

  const handleSubmit = () => {
    if (!allPuzzlesSolved) return;
    const res = onSubmitCode(enteredCode);
    setFeedback({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
    if (!res.success) {
      setEnteredCode('');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (!allPuzzlesSolved || isDoorUnlocked) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (enteredCode.length > 0) {
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allPuzzlesSolved, isDoorUnlocked, enteredCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                isDoorUnlocked
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : allPuzzlesSolved
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              }`}
            >
              {isDoorUnlocked ? (
                <DoorOpen className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                Imperial Hall Fire Exit Lock
              </div>
              <h2 className="text-base font-bold text-white">
                {isDoorUnlocked
                  ? 'Exit Doors Unlocked'
                  : allPuzzlesSolved
                  ? 'Enter 4-Digit Banishing Code'
                  : 'Spectral Seal Active'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Collected Digits Summary in Puzzle ID Order */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono uppercase tracking-wider">
                Collected Digits (Ordered by Puzzle ID)
              </span>
              <span className="font-semibold text-amber-300">
                {solvedCount}/{totalPuzzles} Solved
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {orderedCodeSlots.map((slot) => {
                const roman =
                  ROMAN_NUMERALS[slot.puzzleIndex] || String(slot.puzzleIndex + 1);
                return (
                  <button
                    key={slot.puzzleId}
                    onClick={() => {
                      if (!slot.isSolved) {
                        onOpenPuzzle(slot.puzzleId);
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                      slot.isSolved
                        ? 'bg-emerald-950/60 border-emerald-400/50 text-emerald-200'
                        : 'bg-slate-950/80 border-slate-800 hover:border-amber-500/40 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      Riddle {roman}
                    </span>
                    <span className="text-xl font-mono font-bold mt-0.5">
                      {slot.isSolved ? slot.digit : '?'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Locked Warning if not all puzzles are solved */}
          {!allPuzzlesSolved ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/35 space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-amber-200 leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  The blue exit doors remain magically sealed until all{' '}
                  <strong>{totalPuzzles}</strong> riddles have been verified via the webcam.
                  Click any unsolved riddle above or explore the room to discover the remaining
                  digits.
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Continue Investigating Room
              </button>
            </div>
          ) : (
            <>
              {/* Digital Code Display Screen */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-3">
                {Array.from({ length: codeLength }).map((_, idx) => {
                  const char = enteredCode[idx] || '';
                  return (
                    <div
                      key={idx}
                      className={`w-12 h-14 rounded-xl border font-mono text-2xl font-bold flex items-center justify-center transition-all ${
                        char
                          ? 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900 border-slate-700 text-slate-600'
                      }`}
                    >
                      {char || '•'}
                    </div>
                  );
                })}
              </div>

              {/* Feedback Message */}
              {feedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-950/75 border-emerald-400/60 text-emerald-200'
                      : 'bg-rose-950/75 border-rose-500/60 text-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Numeric Keypad Grid */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    onClick={() => handleDigitPress(digit)}
                    disabled={isDoorUnlocked}
                    className="h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-100 font-mono text-lg font-bold transition-all"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  disabled={isDoorUnlocked}
                  className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-mono uppercase tracking-wider font-semibold"
                >
                  Clear
                </button>
                <button
                  onClick={() => handleDigitPress('0')}
                  disabled={isDoorUnlocked}
                  className="h-12 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700 text-slate-100 font-mono text-lg font-bold transition-all"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={isDoorUnlocked}
                  className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center"
                  title="Backspace"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>

              {/* Submit Unlock Button */}
              <button
                onClick={handleSubmit}
                disabled={enteredCode.length === 0 || isDoorUnlocked}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
              >
                <KeyRound className="w-4 h-4" />
                <span>Unlock Blue Exit Doors</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface StoryIntroModalProps {
  isOpen: boolean;
  gameData: EscapeGameData;
  onClose: () => void;
}

export const StoryIntroModal: React.FC<StoryIntroModalProps> = ({
  isOpen,
  gameData,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-amber-500/40 rounded-2xl shadow-2xl p-6 space-y-5 text-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400">
                Escape Room Dossier
              </div>
              <h2 className="text-lg font-bold text-white">{gameData.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/85 border border-slate-800 text-sm leading-relaxed text-slate-200">
          {gameData.intro}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="font-mono text-amber-400 font-semibold mb-1">1. Explore & Press E</div>
            <p className="text-slate-400">
              Walk with WASD to glowing investigation points near the podium and press E to read each riddle.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="font-mono text-amber-400 font-semibold mb-1">2. Verify on Camera</div>
            <p className="text-slate-400">
              Identify the real-world object described by the clue and hold it up to your webcam for Gemini Vision.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="font-mono text-amber-400 font-semibold mb-1">3. Unlock Exit</div>
            <p className="text-slate-400">
              Collect all {gameData.puzzles?.length || 4} digits and enter the code at the blue exit doors.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition-colors"
        >
          Begin Investigation
        </button>
      </div>
    </div>
  );
};

interface VictoryOutroModalProps {
  isOpen: boolean;
  gameData: EscapeGameData;
  onClose: () => void;
  onPlayAgain: () => void;
}

export const VictoryOutroModal: React.FC<VictoryOutroModalProps> = ({
  isOpen,
  gameData,
  onClose,
  onPlayAgain,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-lg">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-emerald-400/60 rounded-2xl shadow-[0_0_60px_rgba(16,185,129,0.3)] p-6 space-y-5 text-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Curse Broken • Exit Doors Open</span>
              </div>
              <h2 className="text-xl font-bold text-white">{gameData.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-sm leading-relaxed text-emerald-50">
          {gameData.outro}
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Verified Banishing Code
          </span>
          <span className="text-xl font-mono font-bold tracking-widest text-emerald-300">
            {gameData.final_code}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onPlayAgain}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Escape Room</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Explore Unlocked Hall
          </button>
        </div>
      </div>
    </div>
  );
};
