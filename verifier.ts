/**
 * Haunted Room - Stage 2: verify a game, then let Argon fix it until it passes.
 *
 *   Layer 1  Rule check (code)            -> structural problems, e.g. the door code can never be reached
 *   Layer 2  AI playtesters (Flash x 3)   -> can different kinds of players work out each clue?
 *   Fix      Gemini                       -> rewrites the game using the problem list
 *   Human    organiser presses Approve    -> only then does the game start (handled in the UI)
 */
import {
  callGemini,
  parseJson,
  ruleCheck,
  MOCK_INVENTORY,
  MOCK_GAME,
  type Game,
  type Puzzle,
  type RoomObject,
} from './gameGenerator';

const FLASH = 'gemini-3.8-flash';
const ARGON = 'gemini-3.8-pro';

// ---------------------------------------------------------------------------
// Playtester personas (Track 2: check clues work for different kinds of people)
// ---------------------------------------------------------------------------
export const PERSONAS = [
  { id: 'student', label: 'Tired student', emoji: '😴', style: 'a tired university student who reads quickly and takes clues literally' },
  { id: 'non_native', label: 'Non-native speaker', emoji: '🌍', style: 'someone whose first language is not English, who may miss idioms and wordplay' },
  { id: 'kid', label: '10-year-old', emoji: '🧒', style: 'a 10-year-old child who knows simple words and obvious colours and shapes' },
] as const;

export interface Guess {
  persona: string;
  guess_id: string;
  correct: boolean;
  reasoning: string;
}

export type PuzzleVerdict = 'clear' | 'ok' | 'ambiguous' | 'too_hard';

export interface PuzzleTest {
  puzzle_id: string;
  target: string;
  guesses: Guess[];
  correct_count: number;
  verdict: PuzzleVerdict;
  problem?: string;
}

export interface VerifyReport {
  passed: boolean;
  rule_check: { passed: boolean; problems: string[] };
  playtest: PuzzleTest[];
  problems: string[]; // everything that must be fixed, in plain English
}

// ---------------------------------------------------------------------------
// Layer 2: one playtester guesses one clue (the answer is NOT shown to it)
// ---------------------------------------------------------------------------
function playtesterPrompt(puzzle: Puzzle, objects: RoomObject[], personaStyle: string) {
  const list = objects.map((o) => ({ id: o.id, name: o.name, color: o.color, location: o.location }));
  return `You are ${personaStyle}, playing an escape game in a real room.
A ghost gives you this clue: "${puzzle.clue}"
These are the objects you can see in the room:
${JSON.stringify(list)}
Which ONE object does the clue point to? Answer as that kind of person would.
Return ONLY JSON: {"guess_id": "object id from the list", "reasoning": "one short sentence"}`;
}

async function runPlaytester(puzzle: Puzzle, objects: RoomObject[], persona: (typeof PERSONAS)[number]): Promise<Guess> {
  const out = parseJson<{ guess_id: string; reasoning: string }>(
    await callGemini(FLASH, playtesterPrompt(puzzle, objects, persona.style), [], 'low'),
  );
  return { persona: persona.id, guess_id: out.guess_id, correct: out.guess_id === puzzle.target, reasoning: out.reasoning };
}

// Offline stand-in for the playtesters, so the UI can be built without the API.
// A clue that names a colour shared by several objects confuses the testers.
function mockPlaytester(puzzle: Puzzle, objects: RoomObject[], personaIndex: number): Guess {
  const clue = puzzle.clue.toLowerCase();
  const sameColour = objects.filter((o) => new RegExp(`\\b${o.color.toLowerCase()}\\b`).test(clue));
  const persona = PERSONAS[personaIndex].id;
  if (sameColour.length > 1) {
    const pick = sameColour[(personaIndex + 1) % sameColour.length];
    return { persona, guess_id: pick.id, correct: pick.id === puzzle.target, reasoning: `The clue only says "${pick.color}", so I picked the ${pick.name}.` };
  }
  return { persona, guess_id: puzzle.target, correct: true, reasoning: 'Only one object fits this clue.' };
}

function judgePuzzle(puzzle: Puzzle, guesses: Guess[], objects: RoomObject[]): PuzzleTest {
  const correct = guesses.filter((g) => g.correct).length;
  const wrongIds = [...new Set(guesses.filter((g) => !g.correct).map((g) => g.guess_id))];
  let verdict: PuzzleVerdict;
  let problem: string | undefined;

  if (correct === guesses.length) verdict = 'clear';
  else if (correct >= 2) verdict = 'ok';
  else if (wrongIds.length > 0 && correct > 0) {
    verdict = 'ambiguous';
    const names = wrongIds.map((id) => objects.find((o) => o.id === id)?.name ?? id).join(', ');
    problem = `${puzzle.id}: AMBIGUOUS clue. Only ${correct}/${guesses.length} playtesters found the target; others picked: ${names}. Make the clue point to one object only.`;
  } else {
    verdict = 'too_hard';
    problem = `${puzzle.id}: TOO HARD. ${correct}/${guesses.length} playtesters found the target. Make the clue clearer.`;
  }
  return { puzzle_id: puzzle.id, target: puzzle.target, guesses, correct_count: correct, verdict, problem };
}

// ---------------------------------------------------------------------------
// Full verification (layers 1 + 2)
// ---------------------------------------------------------------------------
export async function verifyGame(game: Game, usable: RoomObject[], mock = false): Promise<VerifyReport> {
  const rule_check = ruleCheck(game, usable);

  // All puzzles x all personas run in parallel
  const playtest = await Promise.all(
    game.puzzles.map(async (p) => {
      const guesses = await Promise.all(
        PERSONAS.map((persona, i) => (mock ? Promise.resolve(mockPlaytester(p, usable, i)) : runPlaytester(p, usable, persona))),
      );
      return judgePuzzle(p, guesses, usable);
    }),
  );

  const problems = [...rule_check.problems, ...playtest.filter((t) => t.problem).map((t) => t.problem!)];
  return { passed: problems.length === 0, rule_check, playtest, problems };
}

// ---------------------------------------------------------------------------
// Fix: Argon rewrites the game from the problem list
// ---------------------------------------------------------------------------
export async function fixGame(game: Game, usable: RoomObject[], problems: string[], mock = false): Promise<Game> {
  if (mock) return MOCK_GAME; // the pre-saved good version

  const prompt = `This Halloween escape game failed verification. Fix it.

Problems found:
${problems.map((p) => '- ' + p).join('\n')}

Usable objects in the room: ${JSON.stringify(usable.map((o) => ({ id: o.id, name: o.name, color: o.color, location: o.location })))}

Current game JSON:
${JSON.stringify(game)}

Rules:
- Change ONLY what is needed to fix the problems; keep everything else the same.
- An ambiguous clue must mention a trait or location that no other object in the list shares.
- final_code must equal the reward digits joined in puzzle order.
- Never say the object's name in the clue.
Return ONLY the full fixed game JSON in the same shape.`;
  return parseJson<Game>(await callGemini(ARGON, prompt, [], 'high'));
}

// ---------------------------------------------------------------------------
// Loop: verify -> fix -> verify ... (max 3 rounds). History drives the UI timeline.
// ---------------------------------------------------------------------------
export async function verifyAndFix(game: Game, usable: RoomObject[], opts: { mock?: boolean; maxRounds?: number } = {}) {
  const history: { round: number; game: Game; report: VerifyReport }[] = [];
  let current = game;
  for (let round = 1; round <= (opts.maxRounds ?? 3); round++) {
    const report = await verifyGame(current, usable, opts.mock);
    history.push({ round, game: current, report });
    if (report.passed) break;
    current = await fixGame(current, usable, report.problems, opts.mock);
  }
  const last = history[history.length - 1];
  return { final_game: last.game, passed: last.report.passed, history };
}

// ---------------------------------------------------------------------------
// The demo "broken level": two planted problems
//   p1  "something red as blood"  -> red apple AND red folder fit  -> playtesters disagree
//   final_code 7315 vs digits 7314 -> rule check: this game can never be won
// ---------------------------------------------------------------------------
export const BROKEN_GAME: Game = {
  ...MOCK_GAME,
  puzzles: [
    {
      ...MOCK_GAME.puzzles[0],
      clue: 'Bring me something red as blood, and I will whisper the first number.',
      hints: ['It is red.', 'Something red in this room.'],
      why_it_works: 'Planted problem: two red objects in the room.',
    },
    ...MOCK_GAME.puzzles.slice(1),
  ],
  final_code: '7315',
};
