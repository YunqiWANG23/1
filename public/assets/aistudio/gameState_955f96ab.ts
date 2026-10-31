/**
 * Haunted Room - Stage 4: game state machine (pure logic, no AI).
 * The Live ghost NEVER decides right/wrong. It only reports what it saw;
 * this code decides, then tells the ghost what to say next.
 *
 * Test:  npx tsx gameState.ts --test
 */
import type { Game } from './gameGenerator';

export interface GameState {
  index: number;            // current puzzle (0-based)
  digits: string[];         // digits revealed so far
  hintLevel: number;        // 0 = none, 1 = vague, 2 = strong
  wrongTries: number;       // wrong objects shown for the current puzzle
  allSolved: boolean;       // all puzzles done, waiting for the door code
  escaped: boolean;
  lastEvent: string;        // short text for the UI log
}

export function initialState(): GameState {
  return { index: 0, digits: [], hintLevel: 0, wrongTries: 0, allSolved: false, escaped: false, lastEvent: 'Game started' };
}

export interface ToolResult {
  state: GameState;
  response: Record<string, unknown>; // sent back to the ghost as the function response
}

/** Ghost saw the player hold up an object. object_id may be "unknown". */
export function confirmObjectShown(game: Game, s: GameState, objectId: string): ToolResult {
  if (s.allSolved) {
    return { state: s, response: { result: 'no_puzzle_left', say: 'Tell the players to speak the full door code.' } };
  }
  const puzzle = game.puzzles[s.index];

  if (objectId !== puzzle.target) {
    const wrongTries = s.wrongTries + 1;
    const next = { ...s, wrongTries, lastEvent: `Wrong object: ${objectId}` };
    return {
      state: next,
      response: {
        result: 'wrong',
        say: 'Tell the players, in character, that this is not what you seek. Do not reveal the answer.',
        suggest_hint: wrongTries >= 2,
      },
    };
  }

  const digits = [...s.digits, puzzle.reward_digit];
  const index = s.index + 1;
  const allSolved = index >= game.puzzles.length;
  const next: GameState = {
    ...s, index, digits, hintLevel: 0, wrongTries: 0, allSolved,
    lastEvent: `Solved ${puzzle.id} -> digit ${puzzle.reward_digit}`,
  };
  return {
    state: next,
    response: {
      result: 'correct',
      digit: puzzle.reward_digit,
      digit_position: digits.length,
      say: 'React with delight in character, then reveal the digit.',
      ...(allSolved
        ? { next: 'All puzzles solved. Ask the players to speak the full door code to escape.' }
        : { next_clue: game.puzzles[index].clue, next: 'Read the next clue aloud.' }),
    },
  };
}

/** Players spoke the door code. */
export function checkCode(game: Game, s: GameState, code: string): ToolResult {
  const clean = code.replace(/\D/g, '');
  if (clean === game.final_code) {
    return {
      state: { ...s, escaped: true, lastEvent: 'ESCAPED!' },
      response: { result: 'escaped', say: game.outro },
    };
  }
  return {
    state: { ...s, lastEvent: `Wrong code: ${clean}` },
    response: { result: 'wrong_code', say: 'Mock them gently. The door stays shut.' },
  };
}

/** Players asked for help, or the ghost thinks they are stuck. */
export function requestHint(game: Game, s: GameState): ToolResult {
  if (s.allSolved) return { state: s, response: { hint: 'Combine the digits you have found, in order.' } };
  const puzzle = game.puzzles[s.index];
  const hintLevel = Math.min(s.hintLevel + 1, puzzle.hints.length);
  return {
    state: { ...s, hintLevel, lastEvent: `Hint ${hintLevel} for ${puzzle.id}` },
    response: { hint: puzzle.hints[hintLevel - 1], hint_level: hintLevel },
  };
}

// ---------------------------------------------------------------------------
if (typeof process !== 'undefined' && process.argv?.[1]?.includes('gameState') && process.argv.includes('--test')) {
  import('./gameGenerator').then(({ MOCK_GAME: g }) => {
    let s = initialState();
    const log = (r: ToolResult) => { s = r.state; console.log(s.lastEvent.padEnd(32), JSON.stringify(r.response).slice(0, 90)); };
    log(confirmObjectShown(g, s, 'red_folder'));
    log(confirmObjectShown(g, s, 'unknown'));
    log(requestHint(g, s));
    log(confirmObjectShown(g, s, 'red_apple'));
    log(confirmObjectShown(g, s, 'green_sticky_notes'));
    log(confirmObjectShown(g, s, 'blue_marker'));
    log(confirmObjectShown(g, s, 'orange_folder'));
    log(checkCode(g, s, '1234'));
    log(checkCode(g, s, 'seven three one four'.replace(/seven/,'7').replace(/three/,'3').replace(/one/,'1').replace(/four/,'4')));
    console.log('digits:', s.digits.join(''), 'escaped:', s.escaped);
  });
}
