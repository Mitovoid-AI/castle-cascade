// Plays random legal moves on many generated levels and checks board invariants.
const E = require('../js/engine.js');
const L = require('../js/levels.js');
let errors = 0, wins = 0, plays = 0;
const t0 = Date.now();
function check(g, n, where) {
  const C = g.cols;
  for (let i = 0; i < g.cells.length; i++) {
    const x = g.cells[i];
    if (x.v && (x.p || x.b)) { console.log('void holds stuff', n, where, i); errors++; }
    if (x.b && x.p) { console.log('blocker with piece', n, where, i); errors++; }
  }
  // after a full resolve, no matches should remain
  if (g.findMatches().length) { console.log('matches left', n, where); errors++; }
}
for (let n = 1; n <= 400; n += 1) {
  const lvl = L.getLevel(n);
  const g = new E.Game(lvl, { seed: n * 7, moves: 60 });
  check(g, n, 'init');
  if (!g.hasMove()) { console.log('no initial move', n); errors++; }
  plays++;
  let steps = 0;
  while (g.status === 'play' && steps < 60) {
    const mv = g.findMoves();
    if (!mv.length) { break; }
    const m = mv[(Math.random() * mv.length) | 0];
    const ok = m.tap != null ? g.tap(m.tap) : g.swap(m.a, m.b);
    if (!ok) { console.log('legal move rejected', n, JSON.stringify(m)); errors++; break; }
    g.takeEvents();
    check(g, n, 'step' + steps);
    steps++;
  }
  if (g.status === 'won') { wins++; g.bonus(); g.takeEvents(); }
  // empty cells that are reachable must not exist
  for (let i = 0; i < g.cells.length; i++) {
    const x = g.cells[i], r = (i / g.cols) | 0, c = i % g.cols;
    if (!x.v && !x.b && !x.p && g.reachable(r, c)) { console.log('unfilled reachable cell', n, i); errors++; break; }
  }
}
console.log({ plays, wins, errors, ms: Date.now() - t0 });
