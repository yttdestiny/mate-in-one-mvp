import { Chess } from 'chess.js';
import { puzzles, routes } from '../src/puzzles.js';

let isValid = true;
const seenIds = new Set();
const routeIds = new Set(routes.map((route) => route.id));

function fail(message) {
  isValid = false;
  console.error(message);
}

function withTurn(fen, turn) {
  return fen.replace(/ [wb] /, ` ${turn} `);
}

function expectedSolutionsFor(puzzle) {
  if (Array.isArray(puzzle.solutions) && puzzle.solutions.length) {
    return puzzle.solutions;
  }

  return [puzzle.solution].filter(Boolean);
}

for (const puzzle of puzzles) {
  if (seenIds.has(puzzle.id)) {
    fail(`${puzzle.id}: duplicate puzzle id`);
    continue;
  }
  seenIds.add(puzzle.id);

  if (!Number.isInteger(puzzle.stars) || puzzle.stars < 1 || puzzle.stars > 5) {
    fail(`${puzzle.id}: stars must be an integer from 1 to 5`);
  }

  if (!routeIds.has(puzzle.routeId)) {
    fail(`${puzzle.id}: routeId must point to a defined route`);
  }

  if (!puzzle.station?.name || !puzzle.station?.intro || !puzzle.station?.story || !puzzle.station?.nearby) {
    fail(`${puzzle.id}: station metadata is incomplete`);
  }

  if (!puzzle.category || !Array.isArray(puzzle.tags) || !puzzle.tags.length) {
    fail(`${puzzle.id}: category/tags metadata is incomplete`);
  }

  let game;
  try {
    game = new Chess(puzzle.fen);
  } catch (error) {
    fail(`${puzzle.id}: invalid FEN (${error.message})`);
    continue;
  }

  const turn = puzzle.fen.split(' ')[1];
  const opponent = turn === 'w' ? 'b' : 'w';
  const opponentView = new Chess(withTurn(puzzle.fen, opponent));

  if (game.isCheckmate() || opponentView.isCheckmate()) {
    fail(`${puzzle.id}: initial position is already checkmate`);
  }

  if (opponentView.isCheck()) {
    fail(`${puzzle.id}: non-moving king is already in check`);
  }

  const mateMoves = game
    .moves({ verbose: true })
    .filter((move) => {
      const clone = new Chess(puzzle.fen);
      clone.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
      return clone.isCheckmate();
    })
    .map((move) => move.san);

  const expectedSolutions = expectedSolutionsFor(puzzle);

  if (!mateMoves.length) {
    fail(`${puzzle.id}: expected mate in one, found none`);
  } else if (!expectedSolutions.length) {
    fail(`${puzzle.id}: solution metadata is missing`);
  } else if (!expectedSolutions.every((solution) => mateMoves.includes(solution))) {
    fail(
      `${puzzle.id}: expected ${expectedSolutions.join(', ')}, found ${mateMoves.join(', ')}`,
    );
  } else if (Array.isArray(puzzle.solutions) && mateMoves.some((move) => !expectedSolutions.includes(move))) {
    fail(
      `${puzzle.id}: solutions list is incomplete; expected ${expectedSolutions.join(', ')}, found ${mateMoves.join(', ')}`,
    );
  } else {
    console.log(`${puzzle.id}: ${expectedSolutions.join(' / ')} (${puzzle.stars} star)`);
  }
}

if (!isValid) {
  process.exit(1);
}
