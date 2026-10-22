/* Castle Cascade — level generator.
 * Every level is rebuilt from its number with a seeded RNG, so 1500 levels
 * cost nothing to ship. Move counts come from js/level-table.js, which
 * tools/tune.js writes after a bot has played every level.
 */
(function (root) {
  'use strict';
  const E = root.CCEngine || require('./engine.js');
  const mulberry32 = E.mulberry32;

  const LEVEL_COUNT = 1500;
  const COLOR_NAMES = ['ruby', 'sapphire', 'emerald', 'topaz', 'amethyst', 'amber'];

  function seedFor(n, salt) {
    let h = Math.imul(n ^ 0x9E3779B9, 0x85EBCA6B) ^ Math.imul((salt | 0) + 1, 0xC2B2AE35);
    h ^= h >>> 13;
    h = Math.imul(h, 0x27D4EB2F);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // 0 normal, 1 hard, 2 super hard. Every tenth level is a spike, every
  // fiftieth a bigger one, and the level after a spike is a breather.
  function levelKind(n) {
    if (n < 10) return 0;
    if (n % 50 === 0) return 2;
    if (n % 10 === 0) return 1;
    if (n > 100 && n % 30 === 16) return 1;
    return 0;
  }

  const TIPS = {
    1: 'Swipe a piece into its neighbour to line up 3 of a kind.',
    2: 'Line up 4 to make a Comet. Tap it or swipe it to send it streaking across the board.',
    3: 'Match a 2×2 square to hatch a Dragonfly. It flies straight to your goals.',
    4: 'Match in an L or T shape to make a Powder Keg.',
    5: 'Line up 5 for a Prism. Swipe it into a piece to clear every piece of that colour.',
    6: 'Crates crack when you match right next to them.',
    8: 'Moss clears when a piece on top of it is matched or blasted.',
    9: 'Swipe two boosters into each other for a giant combo.',
    21: 'Chained pieces cannot move. Match them or blast them to break the chain.',
    31: 'Bring the golden crowns down to the bottom row.',
    46: 'Stone only breaks to boosters: comets, powder kegs, dragonflies and prisms.',
  };

  // Hand-tuned opening levels; everything else is generated.
  const TUTORIAL = {
    1: { cols: 7, rows: 7, style: 'rect', colors: 4, goals: [['color', 0, 20]] },
    2: { cols: 7, rows: 8, style: 'rect', colors: 4, goals: [['color', 1, 25], ['color', 2, 25]] },
    3: { cols: 8, rows: 8, style: 'corners', colors: 5, goals: [['color', 3, 25], ['color', 0, 25]] },
    4: { cols: 8, rows: 9, style: 'rect', colors: 5, goals: [['color', 4, 30], ['color', 1, 30]] },
    5: { cols: 8, rows: 9, style: 'pyramid', colors: 5, goals: [['color', 2, 45]] },
    6: { cols: 8, rows: 9, style: 'rect', colors: 5, mech: [['crate', 'bottom', 1]] },
    7: { cols: 8, rows: 9, style: 'corners', colors: 5, mech: [['crate', 'clusters', 1]], color: 1 },
    8: { cols: 8, rows: 9, style: 'rect', colors: 5, mech: [['moss', 'bottomHalf', 1]] },
    9: { cols: 9, rows: 9, style: 'arch', colors: 5, mech: [['crate', 'band', 1]], color: 1 },
  };

  const SHAPES = ['rect', 'rect', 'corners', 'pyramid', 'bowl', 'diamond', 'arch', 'crown', 'wings', 'towers'];

  function shape(cols, rows, style) {
    const top = [], bot = [], mid = (cols - 1) / 2;
    for (let c = 0; c < cols; c++) {
      const d = Math.abs(c - mid), edge = mid - d;
      let t = 0, b = rows - 1;
      switch (style) {
        case 'corners': if (edge < 1) { t = 2; b = rows - 3; } else if (edge < 2) { t = 1; b = rows - 2; } break;
        case 'pyramid': t = Math.round(d * 0.7); break;
        case 'bowl': b = rows - 1 - Math.round(d * 0.7); break;
        case 'diamond': t = Math.round(d * 0.55); b = rows - 1 - Math.round(d * 0.55); break;
        case 'arch': if (d <= 1) b = rows - 3; break;
        case 'crown': t = edge < 1 ? 0 : (Math.round(d) % 2 ? 2 : 0); break;
        case 'wings': if (d <= 1) t = 2; if (edge < 1) b = rows - 2; break;
        case 'towers': if (edge < 1 || d < 0.6) t = 0; else t = 1; if (edge >= 1 && d >= 0.6 && d <= 1.6) b = rows - 2; break;
        default: break;
      }
      if (b - t < 4) t = Math.max(0, b - 4);
      top.push(t);
      bot.push(b);
    }
    return { top, bot };
  }

  function gen(n, salt) {
    const rng = mulberry32(seedFor(n, salt));
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];
    const kind = levelKind(n);
    const tut = TUTORIAL[n];

    // Difficulty climbs slowly over the first few hundred levels, plus spikes.
    const prog = 1 - Math.exp(-n / 260);
    let d = 0.12 + 0.55 * prog + (rng() - 0.5) * 0.16;
    if (kind === 1) d += 0.15;
    if (kind === 2) d += 0.28;
    if (n % 10 === 1 && n > 10) d -= 0.12;
    d = Math.max(0.05, Math.min(1, d));

    let cols, rows, style;
    if (tut) { cols = tut.cols; rows = tut.rows; style = tut.style; }
    else if (n <= 25) { cols = ri(8, 9); rows = ri(8, 9); style = pick(SHAPES.slice(0, 6)); }
    else { cols = rng() < 0.75 ? 9 : 8; rows = rng() < 0.6 ? 10 : 9; style = pick(SHAPES); }
    const { top, bot } = shape(cols, rows, style);

    const N = rows * cols;
    const grid = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) grid.push({ v: r < top[c] || r > bot[c] ? 1 : 0, b: null, hp: 0, moss: 0, lock: 0 });
    }
    const mid = (cols - 1) / 2;
    const at = (r, c) => (r >= 0 && c >= 0 && r < rows && c < cols) ? grid[r * cols + c] : null;
    const playable = (r, c) => { const x = at(r, c); return x && !x.v; };
    // Everything is mirrored left/right so boards look designed.
    const sym = (r, c, fn) => { fn(r, c); const m = cols - 1 - c; if (m !== c) fn(r, m); };

    let colors = 5;
    if (tut) colors = tut.colors;
    else if (n > 100 && kind >= 1 && rng() < 0.3) colors = 6;

    // Pick this level's obstacle mechanics.
    let mech = [];
    let colorGoals = 0;
    if (tut) {
      mech = (tut.mech || []).map((m) => ({ type: m[0], pattern: m[1], hpMax: m[2] }));
      colorGoals = tut.color || 0;
    } else {
      const avail = [['crate', 3], ['moss', 3]];
      if (n >= 21) avail.push(['lock', 2]);
      if (n >= 31) avail.push(['relic', 1.4]);
      if (n >= 46) avail.push(['stone', 1.1]);
      const forced = n === 21 ? 'lock' : n === 31 ? 'relic' : n === 46 ? 'stone' : null;
      let count = 1;
      if (n >= 25 && rng() < 0.4 + d * 0.35) count = 2;
      if (kind >= 1 && n >= 60 && rng() < 0.35) count = 3;
      const pure = !forced && n >= 12 && rng() < 0.13;
      if (pure) count = 0;
      const chosen = forced ? [forced] : [];
      while (chosen.length < count) {
        const pool = avail.filter((a) => !chosen.includes(a[0]));
        let total = 0;
        for (const a of pool) total += a[1];
        let x = rng() * total;
        for (const a of pool) { x -= a[1]; if (x <= 0) { chosen.push(a[0]); break; } }
        if (x > 0) chosen.push(pool[pool.length - 1][0]);
      }
      mech = chosen.map((t) => ({ type: t }));
      if (pure) colorGoals = rng() < 0.5 ? 2 : 3;
      else if (count === 1) colorGoals = rng() < 0.55 ? 1 : 0;
      else if (count === 2) colorGoals = rng() < 0.25 ? 1 : 0;
    }

    const hasRelic = mech.some((m) => m.type === 'relic');
    // Rows a blocker may not use: the spawn row, and the exits on crown levels.
    const blockOK = (r, c) => playable(r, c) && r > top[c] && !(hasRelic && r >= bot[c] - 1);

    for (const m of mech) {
      if (m.type === 'crate') {
        const hpMax = m.hpMax || (n < 10 ? 1 : n < 20 ? 2 : 3);
        const pattern = m.pattern || pick(['bottom', 'bottom', 'clusters', 'band', 'frame', 'scatter', 'pillars', 'checker']);
        const hpOf = () => Math.min(hpMax, 1 + Math.floor(rng() * hpMax * (0.6 + d * 0.7)));
        const put = (r, c, hp) => {
          if (!blockOK(r, c)) return;
          const x = at(r, c);
          if (x.b) return;
          x.b = 'crate';
          x.moss = 0;
          x.hp = Math.max(1, Math.min(hpMax, hp || hpOf()));
        };
        if (pattern === 'bottom') {
          const k = 2 + Math.round(d * 2);
          const hp = hpOf();
          for (let c = 0; c <= mid; c++) for (let j = 0; j < k; j++) sym(bot[c] - j, c, (r, cc) => put(r, cc, j === 0 ? Math.min(hpMax, hp + 1) : hp));
        } else if (pattern === 'band') {
          const r0 = Math.round(rows * (0.45 + rng() * 0.2));
          const h = rng() < 0.45 + d * 0.4 ? 2 : 1;
          const hp = hpOf();
          for (let c = 0; c <= mid; c++) {
            if (Math.round(Math.abs(c - mid)) % 3 === 0) continue;
            for (let j = 0; j < h; j++) sym(r0 + j, c, (r, cc) => put(r, cc, hp));
          }
        } else if (pattern === 'clusters') {
          const k = 2 + Math.round(d * 3);
          for (let q = 0; q < k; q++) {
            const c = ri(0, Math.max(0, Math.floor(mid) - 1));
            const r = ri(2, rows - 3);
            const hp = hpOf();
            for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) sym(r + a, c + b, (rr, cc) => put(rr, cc, hp));
          }
        } else if (pattern === 'frame') {
          const hp = hpOf();
          for (let r = 0; r < rows; r++) sym(r, 0, (rr, cc) => put(rr, cc, hp));
          if (d > 0.5) for (let c = 0; c <= mid; c++) sym(bot[c], c, (rr, cc) => put(rr, cc, hp));
        } else if (pattern === 'pillars') {
          const c = Math.max(0, Math.round(mid) - 2);
          const from = ri(3, Math.max(3, rows - 4));
          const hp = hpOf();
          for (let r = from; r < rows; r++) sym(r, c, (rr, cc) => put(rr, cc, hp));
        } else if (pattern === 'checker') {
          const r0 = Math.floor(rows / 2) - 1;
          for (let r = r0; r < rows; r++) for (let c = 0; c <= mid; c++) if ((r + c) % 2 === 0) sym(r, c, (rr, cc) => put(rr, cc));
        } else {
          const k = Math.round(10 + d * 14);
          for (let q = 0; q < k; q++) sym(ri(2, rows - 1), ri(0, Math.floor(mid)), (r, c) => put(r, c));
        }
      } else if (m.type === 'moss') {
        const hpMax = m.hpMax || (n < 40 ? 1 : 2);
        const pattern = m.pattern || pick(n < 30 ? ['bottomHalf', 'center', 'stripes', 'scatter'] : ['bottomHalf', 'center', 'stripes', 'ring', 'scatter', 'checker', 'full']);
        const hpOf = () => (hpMax > 1 && rng() < 0.3 + d * 0.4) ? 2 : 1;
        const put = (r, c, hp) => {
          const x = at(r, c);
          if (!x || x.v || x.b) return;
          x.moss = hp || hpOf();
        };
        if (pattern === 'bottomHalf') {
          const from = Math.round(rows * (0.45 - d * 0.25));
          for (let r = from; r < rows; r++) for (let c = 0; c < cols; c++) put(r, c, 1);
        } else if (pattern === 'center') {
          const rad = 1.5 + d * 2.5, cr = (rows - 1) / 2;
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (Math.abs(r - cr) + Math.abs(c - mid) <= rad + 0.5) put(r, c);
        } else if (pattern === 'stripes') {
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (Math.round(Math.abs(c - mid)) % 2 === 0 && r > rows / 3) put(r, c);
        } else if (pattern === 'ring') {
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const x = at(r, c);
            if (!x || x.v) continue;
            if (r === top[c] + 1 || r === bot[c] || c === 0 || c === cols - 1) put(r, c);
          }
        } else if (pattern === 'checker') {
          for (let r = 2; r < rows; r++) for (let c = 0; c < cols; c++) if ((r + c) % 2 === 0) put(r, c);
        } else if (pattern === 'full') {
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) put(r, c, 1);
        } else {
          const k = Math.round(14 + d * 16);
          for (let q = 0; q < k; q++) sym(ri(1, rows - 1), ri(0, Math.floor(mid)), (r, c) => put(r, c));
        }
      } else if (m.type === 'lock') {
        const k = Math.round(8 + d * 12);
        for (let q = 0; q < k * 3 && q < 60; q++) {
          const r = ri(2, rows - 1), c = ri(0, Math.floor(mid));
          sym(r, c, (rr, cc) => {
            const x = at(rr, cc);
            if (!blockOK(rr, cc) || x.b || rr <= top[cc] + 1) return;
            x.lock = 1;
          });
          let total = 0;
          for (const x of grid) total += x.lock;
          if (total >= k) break;
        }
      } else if (m.type === 'stone') {
        const k = ri(3, 4 + Math.round(d * 2));
        for (let q = 0; q < k; q++) {
          sym(ri(3, rows - 2), ri(0, Math.floor(mid)), (r, c) => {
            const x = at(r, c);
            if (!blockOK(r, c) || x.b || x.lock) return;
            x.b = 'stone';
            x.hp = 1;
            x.moss = 0;
          });
        }
      }
    }

    // Keep at least ~60% of the board open for pieces.
    let open = 0, play = 0;
    const crates = [];
    for (let i = 0; i < N; i++) {
      if (grid[i].v) continue;
      play++;
      if (!grid[i].b) open++;
      else if (grid[i].b === 'crate') crates.push(i);
    }
    while (open < play * 0.6 && crates.length) {
      const i = crates.splice(Math.floor(rng() * crates.length), 1)[0];
      grid[i].b = null;
      grid[i].hp = 0;
      open++;
    }

    // Goals.
    const goals = [];
    const have = (t) => grid.some((x) => !x.v && (t === 'moss' ? x.moss : t === 'lock' ? x.lock : x.b === t));
    for (const m of mech) {
      if (m.type === 'relic') {
        goals.push({ type: 'relic', count: Math.min(8, 3 + Math.round(d * 3 + rng() * 2)) });
      } else if (have(m.type)) {
        goals.push({ type: m.type, count: 0 });
      }
    }
    if (tut && tut.goals) {
      for (const g of tut.goals) goals.push({ type: g[0], color: g[1], count: g[2] });
    } else {
      if (!goals.length && !colorGoals) colorGoals = 2;
      const palette = [];
      for (let c = 0; c < colors; c++) palette.push(c);
      for (let i = palette.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [palette[i], palette[j]] = [palette[j], palette[i]]; }
      const pure = !goals.length;
      const per = colorGoals === 1 ? 28 + d * 40 : colorGoals === 2 ? (pure ? 45 + d * 35 : 22 + d * 28) : (pure ? 34 + d * 26 : 18 + d * 22);
      for (let k = 0; k < colorGoals && goals.length < 3; k++) {
        const early = Math.min(1, 0.55 + n / 70);
        const cnt = Math.max(10, Math.round((per + Math.min(n, 400) / 25) * early / 5) * 5);
        goals.push({ type: 'color', color: palette[k], count: cnt });
      }
    }

    const lvl = {
      n, kind, salt: salt | 0, rows, cols, top, bot, grid, colors, goals,
      relicMax: 2, style, tip: TIPS[n] || null, difficulty: d,
    };
    lvl.estimate = estimateMoves(lvl);
    return lvl;
  }

  // Rough effort estimate; the tuned table overrides it for levels 1..1500.
  function estimateMoves(L) {
    let effort = 0;
    for (const g of L.goals) {
      if (g.type === 'color') effort += g.count / 2.6;
      else if (g.type === 'relic') effort += g.count * 3.2;
      else {
        let hp = 0;
        for (const x of L.grid) {
          if (x.v) continue;
          if (g.type === 'moss') hp += x.moss;
          else if (g.type === 'lock') hp += x.lock;
          else if (x.b === g.type) hp += x.hp;
        }
        effort += g.type === 'stone' ? hp * 0.9 : hp / 1.7;
      }
    }
    return Math.max(14, Math.min(50, Math.round(effort * 0.85 + 10)));
  }

  function getLevel(n) {
    const tbl = root.CC_LEVEL_TABLE;
    const entry = tbl && tbl[n - 1];
    const salt = entry ? entry[1] : 0;
    const L = gen(n, salt);
    L.moves = entry ? entry[0] : Math.round(L.estimate * (L.kind ? 1.05 : 1.2));
    return L;
  }

  const api = { gen, getLevel, levelKind, estimateMoves, LEVEL_COUNT, COLOR_NAMES, TIPS };
  root.CCLevels = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
