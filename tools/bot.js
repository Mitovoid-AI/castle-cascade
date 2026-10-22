// Greedy bot: simulates every legal move on a clone (fresh random refills)
// and plays the one that makes the most goal progress.
const E = require('../js/engine.js');

const SPECIAL_VALUE = { rh: 3, rv: 3, pr: 3, tnt: 4, lb: 7 };

function remaining(g) {
  return g.goals.map((goal) => {
    if (goal.type === 'color') return goal.left;
    if (goal.type === 'relic') {
      let s = goal.left * 12;
      for (let i = 0; i < g.cells.length; i++) {
        const p = g.cells[i].p;
        if (p && p.k === 'relic') { const c = i % g.cols, r = (i / g.cols) | 0; s -= Math.min(10, r - g.top[c]); }
      }
      return s;
    }
    let s = 0;
    for (const x of g.cells) {
      if (x.v) continue;
      if (goal.type === 'moss') s += x.moss;
      else if (goal.type === 'lock') s += x.lock;
      else if (x.b && x.b.t === goal.type) s += x.b.hp;
    }
    return s;
  });
}

function score(h, before, init) {
  if (h.goalsDone()) return 1e6;
  const rem = remaining(h);
  let s = 0;
  for (let k = 0; k < rem.length; k++) s += (before[k] - rem[k]) / Math.max(1, init[k]) * 100;
  for (const x of h.cells) if (x.p && SPECIAL_VALUE[x.p.k]) s += SPECIAL_VALUE[x.p.k] * 0.6;
  return s;
}

function apply(g, m) { return m.tap != null ? g.tap(m.tap) : g.swap(m.a, m.b); }

// Returns moves used to win, or null if it ran out of the cap.
function play(level, seed, cap) {
  const rng = E.mulberry32(seed ^ 0xabcdef);
  const g = new E.Game(level, { seed, moves: cap, record: false });
  const init = remaining(g);
  let used = 0;
  while (g.status === 'play' && used < cap) {
    const moves = g.findMoves();
    if (!moves.length) break;
    const before = remaining(g);
    let best = moves[0], bestS = -Infinity;
    for (const m of moves) {
      const h = g.clone((rng() * 4294967296) >>> 0);
      if (!apply(h, m)) continue;
      const s = score(h, before, init) + rng() * 0.5;
      if (s > bestS) { bestS = s; best = m; }
    }
    apply(g, best);
    used++;
  }
  return g.status === 'won' ? used : null;
}

module.exports = { play, remaining };
