/* Castle Cascade — match-3 rules engine.
 * Pure logic, no DOM: the browser replays the events it records, and the
 * Node tuning bot (tools/tune.js) plays thousands of levels with it.
 *
 * Board: flat array of cells, index = r * cols + c, row 0 at the top.
 * Piece kinds: g (gem, has colour c), rh / rv (rocket clearing a row / column),
 * tnt, pr (propeller), lb (light ball), relic (must reach the bottom).
 */
(function (root) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const SPECIAL = { rh: 1, rv: 1, tnt: 1, pr: 1, lb: 1 };
  const isSpecial = (p) => !!(p && SPECIAL[p.k]);
  const isRocket = (k) => k === 'rh' || k === 'rv';

  // Which combo two swapped specials make, and what the propeller / light ball carries.
  function comboOf(k1, k2) {
    if (k1 === 'lb' && k2 === 'lb') return { combo: 'bb' };
    if (k1 === 'lb' || k2 === 'lb') return { combo: 'bX', carry: k1 === 'lb' ? k2 : k1 };
    if (k1 === 'pr' && k2 === 'pr') return { combo: 'pp' };
    if (k1 === 'pr' || k2 === 'pr') return { combo: 'pX', carry: k1 === 'pr' ? k2 : k1 };
    if (k1 === 'tnt' && k2 === 'tnt') return { combo: 'tt' };
    if (k1 === 'tnt' || k2 === 'tnt') return { combo: 'rt' };
    return { combo: 'rr' };
  }

  class Game {
    constructor(level, opt) {
      opt = opt || {};
      this.level = level;
      this.rows = level.rows;
      this.cols = level.cols;
      this.colors = level.colors;
      this.moves = opt.moves != null ? opt.moves : level.moves;
      this.rng = mulberry32(opt.seed != null ? opt.seed : (Math.random() * 4294967296) >>> 0);
      this.rec = opt.record !== false;
      this.events = [];
      this.nextId = 1;
      this.status = 'play';
      this.inBonus = false;
      this.cleared = 0;
      this.top = level.top;
      this.bot = level.bot;
      this.relicMax = level.relicMax || 2;
      this.relicTotal = 0;
      this.relicSpawned = 0;
      this.relicOnBoard = 0;
      this.sinceRelic = 0;

      const N = this.rows * this.cols;
      this.cells = new Array(N);
      for (let i = 0; i < N; i++) {
        const s = level.grid[i];
        this.cells[i] = {
          v: !!s.v,
          p: null,
          b: s.b ? { t: s.b, hp: s.hp || 1 } : null,
          moss: s.moss || 0,
          lock: s.lock || 0,
        };
      }

      // Obstacle goals always count what is actually on the board.
      const count = { crate: 0, stone: 0, moss: 0, lock: 0 };
      for (const x of this.cells) {
        if (x.v) continue;
        if (x.b) count[x.b.t]++;
        if (x.moss) count.moss++;
        if (x.lock) count.lock++;
      }
      this.goals = level.goals.map((g) => {
        const total = count[g.type] != null ? count[g.type] : g.count;
        return { type: g.type, color: g.color, total, left: total };
      });
      const relicGoal = this.goals.find((g) => g.type === 'relic');
      if (relicGoal) this.relicTotal = relicGoal.total;

      this.fillInitial(opt.boosters || []);
    }

    ev(e) { if (this.rec) this.events.push(e); }
    takeEvents() { const e = this.events; this.events = []; return e; }

    // ---------- setup ----------

    colorAt(r, c) {
      if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return -1;
      const x = this.cells[r * this.cols + c];
      return (!x.v && !x.b && x.p && x.p.k === 'g') ? x.p.c : -1;
    }

    // A colour for cell i that does not complete a line of 3 or a 2x2 square.
    safeColor(i) {
      const C = this.cols, r = (i / C) | 0, c = i - r * C;
      const at = (dr, dc) => this.colorAt(r + dr, c + dc);
      const start = (this.rng() * this.colors) | 0;
      for (let k = 0; k < this.colors; k++) {
        const x = (start + k) % this.colors;
        if (at(0, -1) === x && (at(0, -2) === x || at(0, 1) === x)) continue;
        if (at(0, 1) === x && at(0, 2) === x) continue;
        if (at(-1, 0) === x && (at(-2, 0) === x || at(1, 0) === x)) continue;
        if (at(1, 0) === x && at(2, 0) === x) continue;
        let sq = false;
        for (let dr = -1; dr <= 0 && !sq; dr++) {
          for (let dc = -1; dc <= 0 && !sq; dc++) {
            let n = 0;
            for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
              const rr = dr + a, cc = dc + b;
              if (rr === 0 && cc === 0) continue;
              if (at(rr, cc) === x) n++;
            }
            if (n === 3) sq = true;
          }
        }
        if (sq) continue;
        return x;
      }
      return start;
    }

    newGem(c) { return { id: this.nextId++, k: 'g', c }; }

    fillInitial(boosters) {
      const C = this.cols, N = this.rows * C, cells = this.cells;
      // Relics start near the top of random columns.
      const relics = Math.min(this.relicTotal, this.relicMax);
      if (relics > 0) {
        const cols = [];
        for (let c = 0; c < C; c++) {
          const r = this.top[c] + 1;
          if (r < this.bot[c] - 2 && !cells[r * C + c].b && !cells[r * C + c].lock) cols.push(c);
        }
        this.shuffleArr(cols);
        for (let k = 0; k < relics && k < cols.length; k++) {
          const c = cols[k];
          cells[(this.top[c] + 1) * C + c].p = { id: this.nextId++, k: 'relic', c: -1 };
          this.relicSpawned++;
          this.relicOnBoard++;
        }
      }
      for (let i = 0; i < N; i++) {
        const x = cells[i];
        if (!x.v && !x.b && !x.p) x.p = this.newGem(this.safeColor(i));
      }
      for (const b of boosters) {
        const cand = this.gemCells(true);
        if (!cand.length) break;
        const i = cand[(this.rng() * cand.length) | 0];
        const k = b === 'rocket' ? (this.rng() < 0.5 ? 'rh' : 'rv') : b;
        cells[i].p = { id: this.nextId++, k, c: -1 };
      }
      for (let k = 0; k < 40 && !this.hasMove(); k++) this.recolor(this.gemCells(true));
    }

    shuffleArr(a) {
      for (let i = a.length - 1; i > 0; i--) {
        const j = (this.rng() * (i + 1)) | 0;
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    // Indices of cells holding a plain gem; unlockedOnly skips chained cells.
    gemCells(unlockedOnly) {
      const out = [];
      for (let i = 0; i < this.cells.length; i++) {
        const x = this.cells[i];
        if (!x.v && !x.b && x.p && x.p.k === 'g' && !(unlockedOnly && x.lock)) out.push(i);
      }
      return out;
    }

    recolor(list) {
      for (const i of list) this.cells[i].p.c = -1;
      for (const i of list) this.cells[i].p.c = this.safeColor(i);
    }

    // ---------- queries ----------

    movable(i) {
      const x = this.cells[i];
      return !!(x && !x.v && !x.b && !x.lock && x.p);
    }

    adjacent(a, b) {
      const C = this.cols;
      if (a < 0 || b < 0) return false;
      const ra = (a / C) | 0, rb = (b / C) | 0;
      return (ra === rb && Math.abs(a - b) === 1) || Math.abs(a - b) === C;
    }

    matchAt(i) {
      const C = this.cols, r = (i / C) | 0, c = i - r * C;
      const x = this.colorAt(r, c);
      if (x < 0) return false;
      let n = 1;
      for (let k = c - 1; this.colorAt(r, k) === x; k--) n++;
      for (let k = c + 1; this.colorAt(r, k) === x; k++) n++;
      if (n >= 3) return true;
      n = 1;
      for (let k = r - 1; this.colorAt(k, c) === x; k--) n++;
      for (let k = r + 1; this.colorAt(k, c) === x; k++) n++;
      if (n >= 3) return true;
      for (let dr = -1; dr <= 0; dr++) {
        for (let dc = -1; dc <= 0; dc++) {
          if (this.colorAt(r + dr, c + dc) === x && this.colorAt(r + dr + 1, c + dc) === x &&
              this.colorAt(r + dr, c + dc + 1) === x && this.colorAt(r + dr + 1, c + dc + 1) === x) return true;
        }
      }
      return false;
    }

    // Every legal move: {a, b} swaps and {tap} special activations.
    findMoves(firstOnly) {
      const out = [], C = this.cols, R = this.rows, cells = this.cells;
      for (let i = 0; i < cells.length; i++) {
        if (!this.movable(i)) continue;
        const p = cells[i].p;
        if (isSpecial(p)) {
          out.push({ tap: i });
          if (firstOnly) return out;
        }
        const r = (i / C) | 0, c = i - r * C;
        const nbs = [];
        if (c < C - 1) nbs.push(i + 1);
        if (r < R - 1) nbs.push(i + C);
        for (const j of nbs) {
          if (!this.movable(j)) continue;
          const q = cells[j].p;
          if (isSpecial(p) || isSpecial(q)) {
            out.push({ a: i, b: j });
            if (firstOnly) return out;
            continue;
          }
          if (p.k === 'g' && q.k === 'g' && p.c === q.c) continue;
          cells[i].p = q; cells[j].p = p;
          const ok = this.matchAt(i) || this.matchAt(j);
          cells[i].p = p; cells[j].p = q;
          if (ok) {
            out.push({ a: i, b: j });
            if (firstOnly) return out;
          }
        }
      }
      return out;
    }

    hasMove() { return this.findMoves(true).length > 0; }

    // ---------- matching ----------

    findMatches() {
      const R = this.rows, C = this.cols, N = R * C, cells = this.cells;
      const col = new Int8Array(N);
      for (let i = 0; i < N; i++) {
        const x = cells[i];
        col[i] = (!x.v && !x.b && x.p && x.p.k === 'g') ? x.p.c : -1;
      }
      const h = new Uint8Array(N), v = new Uint8Array(N), sq = new Uint8Array(N);
      let any = false;
      for (let r = 0; r < R; r++) {
        let c = 0;
        while (c < C) {
          const x = col[r * C + c];
          if (x < 0) { c++; continue; }
          let e = c + 1;
          while (e < C && col[r * C + e] === x) e++;
          if (e - c >= 3) { any = true; for (let k = c; k < e; k++) h[r * C + k] = e - c; }
          c = e;
        }
      }
      for (let c = 0; c < C; c++) {
        let r = 0;
        while (r < R) {
          const x = col[r * C + c];
          if (x < 0) { r++; continue; }
          let e = r + 1;
          while (e < R && col[e * C + c] === x) e++;
          if (e - r >= 3) { any = true; for (let k = r; k < e; k++) v[k * C + c] = e - r; }
          r = e;
        }
      }
      for (let r = 0; r < R - 1; r++) {
        for (let c = 0; c < C - 1; c++) {
          const i = r * C + c, x = col[i];
          if (x >= 0 && col[i + 1] === x && col[i + C] === x && col[i + C + 1] === x) {
            any = true;
            sq[i] = sq[i + 1] = sq[i + C] = sq[i + C + 1] = 1;
          }
        }
      }
      if (!any) return [];

      const seen = new Uint8Array(N), groups = [];
      for (let s = 0; s < N; s++) {
        if (seen[s] || !(h[s] || v[s] || sq[s])) continue;
        const x = col[s], members = [], cross = [], stack = [s];
        let maxH = 0, maxV = 0, hasSq = false;
        seen[s] = 1;
        while (stack.length) {
          const i = stack.pop();
          members.push(i);
          if (h[i] > maxH) maxH = h[i];
          if (v[i] > maxV) maxV = v[i];
          if (sq[i]) hasSq = true;
          if (h[i] && v[i]) cross.push(i);
          const r = (i / C) | 0, c = i - r * C;
          const push = (j) => {
            if (!seen[j] && col[j] === x && (h[j] || v[j] || sq[j])) { seen[j] = 1; stack.push(j); }
          };
          if (c > 0) push(i - 1);
          if (c < C - 1) push(i + 1);
          if (r > 0) push(i - C);
          if (r < R - 1) push(i + C);
        }
        let sp = null;
        if (maxH >= 5 || maxV >= 5) sp = 'lb';
        else if (maxH >= 3 && maxV >= 3) sp = 'tnt';
        else if (maxH === 4) sp = 'rv';
        else if (maxV === 4) sp = 'rh';
        else if (hasSq) sp = 'pr';
        groups.push({ cells: members, color: x, sp, cross });
      }
      return groups;
    }

    // Where a match group's new special appears: the moved piece if possible.
    pickSpot(g, prefer) {
      const cand = (g.sp === 'tnt' && g.cross.length) ? g.cross : g.cells;
      const free = (i) => !this.cells[i].lock;
      if (prefer) for (const i of prefer) if (cand.includes(i) && free(i)) return i;
      const ok = cand.filter(free).sort((a, b) => a - b);
      if (ok.length) return ok[ok.length >> 1];
      const any = g.cells.filter(free);
      return any.length ? any[any.length >> 1] : -1;
    }

    goalDec(type, color) {
      for (let k = 0; k < this.goals.length; k++) {
        const g = this.goals[k];
        if (g.type === type && (type !== 'color' || g.color === color) && g.left > 0) {
          g.left--;
          return k;
        }
      }
      return -1;
    }

    neighbors(i) {
      const C = this.cols, R = this.rows, r = (i / C) | 0, c = i - r * C, out = [];
      if (c > 0) out.push(i - 1);
      if (c < C - 1) out.push(i + 1);
      if (r > 0) out.push(i - C);
      if (r < R - 1) out.push(i + C);
      return out;
    }

    hitBlocker(i, hits, d) {
      const cell = this.cells[i], b = cell.b;
      b.hp--;
      const hit = { i, k: b.t, hp: b.hp, d };
      if (b.hp <= 0) {
        cell.b = null;
        hit.gi = this.goalDec(b.t);
      }
      hits.push(hit);
    }

    hitMoss(i, hits, d) {
      const cell = this.cells[i];
      cell.moss--;
      const hit = { i, k: 'moss', hp: cell.moss, d };
      if (cell.moss <= 0) { cell.moss = 0; hit.gi = this.goalDec('moss'); }
      hits.push(hit);
    }

    clearGroups(groups, prefer, combo) {
      const hits = [], created = [];
      for (const g of groups) {
        const spot = g.sp ? this.pickSpot(g, prefer) : -1;
        const adj = new Set();
        for (const i of g.cells) {
          const cell = this.cells[i];
          if (cell.lock) {
            cell.lock = 0;
            hits.push({ i, k: 'lock', d: 0, gi: this.goalDec('lock') });
            continue;
          }
          const p = cell.p;
          cell.p = null;
          const hit = { i, k: 'gem', id: p.id, c: p.c, d: 0, gi: this.goalDec('color', p.c) };
          if (spot >= 0) hit.into = spot;
          hits.push(hit);
          if (cell.moss) this.hitMoss(i, hits, 0);
          for (const nb of this.neighbors(i)) {
            const b = this.cells[nb].b;
            if (b && b.t === 'crate') adj.add(nb);
          }
        }
        for (const nb of adj) if (this.cells[nb].b) this.hitBlocker(nb, hits, 60);
        if (spot >= 0 && !this.cells[spot].p && !this.cells[spot].b) {
          const np = { id: this.nextId++, k: g.sp, c: -1 };
          this.cells[spot].p = np;
          created.push({ i: spot, id: np.id, k: np.k });
        }
      }
      this.cleared += hits.length;
      this.ev({ t: 'match', hits, created, combo });
    }

    // ---------- blasts ----------

    // One blast reaching cell i. Specials caught in it go to the next wave.
    hitCell(i, hits, next, d, seen) {
      if (i < 0 || i >= this.cells.length || seen[i]) return;
      seen[i] = 1;
      const cell = this.cells[i];
      if (cell.v) return;
      if (cell.b) { this.hitBlocker(i, hits, d); return; }
      if (cell.lock) {
        cell.lock = 0;
        hits.push({ i, k: 'lock', d, gi: this.goalDec('lock') });
        return;
      }
      const p = cell.p;
      if (p) {
        if (SPECIAL[p.k]) {
          cell.p = null;
          next.push({ i, p });
        } else if (p.k === 'g') {
          cell.p = null;
          hits.push({ i, k: 'gem', id: p.id, c: p.c, d, gi: this.goalDec('color', p.c) });
        }
      }
      if (cell.moss) this.hitMoss(i, hits, d);
    }

    mostCommonColor() {
      const n = new Array(this.colors).fill(0);
      for (const x of this.cells) if (!x.v && !x.b && x.p && x.p.k === 'g') n[x.p.c]++;
      let best = 0, bc = 0;
      for (let c = 0; c < n.length; c++) {
        if (n[c] > best || (n[c] === best && this.rng() < 0.5)) { best = n[c]; bc = c; }
      }
      return bc;
    }

    // Best cell for a propeller: whatever still counts toward a goal.
    pickTarget(seen) {
      const C = this.cols, cells = this.cells;
      const need = {};
      const colors = {};
      for (const g of this.goals) {
        if (g.left <= 0) continue;
        if (g.type === 'color') colors[g.color] = 1;
        else need[g.type] = 1;
      }
      let best = -1, bestS = 0, ties = 0;
      for (let i = 0; i < cells.length; i++) {
        if (seen[i]) continue;
        const x = cells[i];
        if (x.v) continue;
        let s = 0;
        if (x.b) s = need[x.b.t] ? (x.b.t === 'stone' ? 12 : 10) : 2;
        else if (x.lock) s = need.lock ? 8 : 1;
        else if (x.moss && need.moss) s = 7;
        else if (x.p) {
          if (x.p.k === 'g') s = colors[x.p.c] ? 4 : 1;
          else if (x.p.k !== 'relic') s = 1;
        }
        if (need.relic && !x.b && i >= C && cells[i - C].p && cells[i - C].p.k === 'relic') s = Math.max(s, 6);
        if (s <= 0) continue;
        if (s > bestS) { bestS = s; best = i; ties = 1; } else if (s === bestS) {
          ties++;
          if (this.rng() * ties < 1) best = i;
        }
      }
      return best;
    }

    // Area effects shared by specials, combos and carried boosters.
    blastShape(kind, i, base, hits, next, seen, fx) {
      const C = this.cols, R = this.rows, r = (i / C) | 0, c = i - r * C;
      const row = (rr, d0) => { if (rr < 0 || rr >= R) return; for (let cc = 0; cc < C; cc++) this.hitCell(rr * C + cc, hits, next, base + d0 + Math.abs(cc - c) * 32, seen); };
      const column = (cc, d0) => { if (cc < 0 || cc >= C) return; for (let rr = 0; rr < R; rr++) this.hitCell(rr * C + cc, hits, next, base + d0 + Math.abs(rr - r) * 32, seen); };
      const square = (rad) => {
        for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || cc < 0 || rr >= R || cc >= C) continue;
          this.hitCell(rr * C + cc, hits, next, base + Math.max(Math.abs(dr), Math.abs(dc)) * 45, seen);
        }
      };
      if (kind === 'rh') { fx.push({ t: 'rocket', i, dir: 'h', d: base }); row(r, 0); }
      else if (kind === 'rv') { fx.push({ t: 'rocket', i, dir: 'v', d: base }); column(c, 0); }
      else if (kind === 'rr') {
        fx.push({ t: 'rocket', i, dir: 'h', d: base }, { t: 'rocket', i, dir: 'v', d: base });
        row(r, 0); column(c, 0);
      } else if (kind === 'rt') {
        for (let k = -1; k <= 1; k++) {
          fx.push({ t: 'rocket', i: Math.max(0, Math.min(R - 1, r + k)) * C + c, dir: 'h', d: base, big: 1 });
          fx.push({ t: 'rocket', i: r * C + Math.max(0, Math.min(C - 1, c + k)), dir: 'v', d: base, big: 1 });
          row(r + k, 0); column(c + k, 0);
        }
      } else if (kind === 'tnt') { fx.push({ t: 'tnt', i, rad: 2, d: base }); square(2); }
      else if (kind === 'tt') { fx.push({ t: 'tnt', i, rad: 3, d: base }); square(3); }
    }

    activate(item, hits, fx, next, transforms, removed) {
      const C = this.cols, i = item.i, p = item.p;
      removed.push(p.id);
      if (item.other) removed.push(item.other.id);
      const seen = new Uint8Array(this.cells.length);
      const combo = item.combo;
      const kind = combo || p.k;

      if (kind === 'rh' || kind === 'rv' || kind === 'tnt' || kind === 'rr' || kind === 'rt' || kind === 'tt') {
        this.blastShape(kind, i, 0, hits, next, seen, fx);
        return;
      }
      if (kind === 'pr' || kind === 'pp' || kind === 'pX') {
        this.hitCell(i, hits, next, 0, seen);
        for (const nb of this.neighbors(i)) this.hitCell(nb, hits, next, 40, seen);
        const flights = kind === 'pp' ? 3 : 1;
        for (let f = 0; f < flights; f++) {
          const to = this.pickTarget(seen);
          if (to < 0) break;
          fx.push({ t: 'prop', i, to, d: 0, carry: item.carry || null });
          const land = 380 + f * 90;
          if (kind === 'pX') {
            const carry = item.carry === 'tnt' ? 'tnt' : item.carry;
            this.blastShape(carry, to, land, hits, next, seen, fx);
          } else {
            this.hitCell(to, hits, next, land, seen);
          }
        }
        return;
      }
      if (kind === 'lb') {
        const color = item.color != null ? item.color : this.mostCommonColor();
        const targets = [];
        for (let j = 0; j < this.cells.length; j++) {
          const x = this.cells[j];
          if (!x.v && !x.b && x.p && x.p.k === 'g' && x.p.c === color) targets.push(j);
        }
        fx.push({ t: 'ball', i, targets, d: 0 });
        this.hitCell(i, hits, next, 0, seen);
        targets.forEach((j, k) => this.hitCell(j, hits, next, 140 + Math.min(k, 30) * 22, seen));
        return;
      }
      if (kind === 'bX') {
        const color = this.mostCommonColor();
        const targets = [];
        for (let j = 0; j < this.cells.length; j++) {
          const x = this.cells[j];
          if (!x.v && !x.b && !x.lock && x.p && x.p.k === 'g' && x.p.c === color) targets.push(j);
        }
        fx.push({ t: 'ball', i, targets, d: 0 });
        targets.forEach((j, k) => {
          const x = this.cells[j], q = x.p;
          q.k = isRocket(item.carry) ? (this.rng() < 0.5 ? 'rh' : 'rv') : item.carry;
          q.c = -1;
          transforms.push({ i: j, id: q.id, k: q.k, d: 140 + Math.min(k, 30) * 22 });
          x.p = null;
          next.push({ i: j, p: q });
        });
        return;
      }
      if (kind === 'bb') {
        const R = this.rows, r = (i / C) | 0, c = i - r * C;
        fx.push({ t: 'nova', i, d: 0 });
        for (let j = 0; j < this.cells.length; j++) {
          const rr = (j / C) | 0, cc = j - rr * C;
          this.hitCell(j, hits, next, 100 + Math.max(Math.abs(rr - r), Math.abs(cc - c)) * 55, seen);
        }
        void R;
      }
    }

    runWaves(queue) {
      let guard = 0;
      while (queue.length && guard++ < 80) {
        const hits = [], fx = [], next = [], transforms = [], removed = [];
        for (const item of queue) this.activate(item, hits, fx, next, transforms, removed);
        this.cleared += hits.length;
        this.ev({ t: 'blast', hits, fx, removed, transforms });
        queue = next;
      }
    }

    // ---------- gravity ----------

    // Can an empty cell be filled by something falling straight down?
    reachable(r, c) {
      const C = this.cols;
      for (let k = r - 1; k >= this.top[c]; k--) {
        const x = this.cells[k * C + c];
        if (x.b || x.lock) return false;
        if (x.p) return true;
      }
      return true;
    }

    spawnPiece() {
      if (this.relicSpawned < this.relicTotal && this.relicOnBoard < this.relicMax) {
        this.sinceRelic++;
        if ((this.relicOnBoard === 0 && this.sinceRelic > 5) || this.rng() < 0.05) {
          this.relicSpawned++;
          this.relicOnBoard++;
          this.sinceRelic = 0;
          return { id: this.nextId++, k: 'relic', c: -1 };
        }
      }
      return this.newGem((this.rng() * this.colors) | 0);
    }

    // Pieces fall one cell per tick; when nothing can fall straight, they slide
    // diagonally around blockers. Paths are [row, col, tick] waypoints.
    gravity() {
      const R = this.rows, C = this.cols, cells = this.cells, top = this.top, bot = this.bot;
      const rec = this.rec;
      const paths = rec ? new Map() : null;
      const landed = new Map();
      let t = 0;
      const note = (p, fr, fc, tr, tc, spawned) => {
        landed.set(p.id, tr * C + tc);
        if (!rec) return;
        let e = paths.get(p.id);
        if (!e) {
          e = { id: p.id, path: [[fr, fc, t - 1]] };
          if (spawned) e.p = { id: p.id, k: p.k, c: p.c };
          paths.set(p.id, e);
        } else {
          const last = e.path[e.path.length - 1];
          if (last[2] < t - 1) e.path.push([last[0], last[1], t - 1]);
        }
        e.path.push([tr, tc, t]);
      };
      for (;;) {
        t++;
        let changed = false;
        for (let c = 0; c < C; c++) {
          for (let r = bot[c]; r >= top[c]; r--) {
            const i = r * C + c, cell = cells[i];
            if (cell.v || cell.b || cell.p) continue;
            if (r === top[c]) {
              const np = this.spawnPiece();
              cell.p = np;
              note(np, r - 1, c, r, c, true);
              changed = true;
              continue;
            }
            const up = cells[i - C];
            if (up.p && !up.b && !up.lock) {
              cell.p = up.p;
              up.p = null;
              note(cell.p, r - 1, c, r, c, false);
              changed = true;
            }
          }
        }
        if (!changed) {
          const order = (t & 1) ? [-1, 1] : [1, -1];
          for (let r = R - 1; r >= 1; r--) {
            for (let c = 0; c < C; c++) {
              const i = r * C + c, cell = cells[i];
              if (cell.v || cell.b || cell.p) continue;
              if (this.reachable(r, c)) continue;
              for (const dc of order) {
                const sc = c + dc;
                if (sc < 0 || sc >= C) continue;
                const s = cells[(r - 1) * C + sc];
                if (s.v || s.b || s.lock || !s.p) continue;
                const below = cells[r * C + sc];
                if (!below.v && !below.b && !below.p) continue;
                cell.p = s.p;
                s.p = null;
                note(cell.p, r - 1, sc, r, c, false);
                changed = true;
                break;
              }
            }
          }
        }
        if (!changed || t > 400) break;
      }
      if (rec && paths.size) this.ev({ t: 'fall', moves: Array.from(paths.values()), T: t - 1 });
      return Array.from(landed.values());
    }

    collectRelics() {
      let any = false;
      const C = this.cols;
      for (let c = 0; c < C; c++) {
        const i = this.bot[c] * C + c, cell = this.cells[i];
        if (cell.p && cell.p.k === 'relic' && !cell.lock) {
          const id = cell.p.id;
          cell.p = null;
          this.relicOnBoard--;
          this.ev({ t: 'collect', i, id, gi: this.goalDec('relic') });
          any = true;
        }
      }
      return any;
    }

    // ---------- turn flow ----------

    resolve(combo) {
      for (let guard = 0; guard < 300; guard++) {
        const landed = this.gravity();
        if (this.collectRelics()) continue;
        const groups = this.findMatches();
        if (!groups.length) break;
        combo++;
        this.clearGroups(groups, landed, combo);
      }
      this.settle();
    }

    goalsDone() { return this.goals.every((g) => g.left <= 0); }

    settle() {
      if (this.inBonus) return;
      if (this.goalsDone()) { this.status = 'won'; return; }
      if (this.moves <= 0) { this.status = 'lost'; return; }
      if (!this.hasMove()) this.shuffle();
    }

    swap(a, b) {
      if (this.status !== 'play' || !this.adjacent(a, b) || !this.movable(a) || !this.movable(b)) return false;
      const ca = this.cells[a], cb = this.cells[b], pa = ca.p, pb = cb.p;
      const sa = isSpecial(pa), sb = isSpecial(pb);
      ca.p = pb; cb.p = pa;
      if (!sa && !sb) {
        const groups = this.findMatches();
        if (!groups.length) {
          ca.p = pa; cb.p = pb;
          this.ev({ t: 'swap', a, b, back: true });
          return false;
        }
        this.ev({ t: 'swap', a, b });
        this.moves--;
        this.clearGroups(groups, [b, a], 1);
        this.resolve(1);
        return true;
      }
      this.ev({ t: 'swap', a, b });
      this.moves--;
      if (sa && sb) {
        ca.p = null; cb.p = null;
        const cmb = comboOf(pa.k, pb.k);
        this.runWaves([{ i: b, p: pa, other: pb, combo: cmb.combo, carry: cmb.carry }]);
      } else {
        const sp = sa ? pa : pb, at = sa ? b : a, other = sa ? pb : pa;
        this.cells[at].p = null;
        const item = { i: at, p: sp };
        if (sp.k === 'lb' && other.k === 'g') item.color = other.c;
        this.runWaves([item]);
      }
      this.resolve(0);
      return true;
    }

    tap(i) {
      if (this.status !== 'play' || !this.movable(i) || !isSpecial(this.cells[i].p)) return false;
      const p = this.cells[i].p;
      this.cells[i].p = null;
      this.moves--;
      this.ev({ t: 'tap', i, id: p.id });
      this.runWaves([{ i, p }]);
      this.resolve(0);
      return true;
    }

    // In-game boosters do not cost a move.
    useBooster(kind, i) {
      if (this.status !== 'play') return false;
      if (kind === 'shuffle') return this.shuffle(true);
      const C = this.cols, R = this.rows, r = (i / C) | 0, c = i - r * C;
      if (i < 0 || i >= this.cells.length || this.cells[i].v) return false;
      const hits = [], next = [], fx = [], seen = new Uint8Array(this.cells.length);
      if (kind === 'hammer') {
        fx.push({ t: 'hammer', i, d: 0 });
        this.hitCell(i, hits, next, 220, seen);
      } else if (kind === 'arrow') {
        fx.push({ t: 'arrow', i, d: 0 });
        for (let cc = 0; cc < C; cc++) this.hitCell(r * C + cc, hits, next, 120 + cc * 34, seen);
      } else if (kind === 'cannon') {
        fx.push({ t: 'cannon', i, d: 0 });
        for (let rr = 0; rr < R; rr++) this.hitCell(rr * C + c, hits, next, 120 + rr * 34, seen);
      } else return false;
      this.cleared += hits.length;
      this.ev({ t: 'blast', hits, fx, removed: [], transforms: [] });
      this.runWaves(next);
      this.resolve(0);
      return true;
    }

    shuffle(forced) {
      const idx = this.gemCells(true);
      if (idx.length < 3) return false;
      const orig = idx.map((i) => this.cells[i].p);
      const origColors = orig.map((p) => p.c);
      const emit = () => {
        const items = idx.map((i) => ({ i, id: this.cells[i].p.id, c: this.cells[i].p.c }));
        this.ev({ t: 'shuffle', items, forced: !!forced });
        return true;
      };
      for (let attempt = 0; attempt < 60; attempt++) {
        const perm = this.shuffleArr(orig.slice());
        idx.forEach((i, k) => { this.cells[i].p = perm[k]; });
        if (!this.findMatches().length && this.hasMove()) return emit();
      }
      idx.forEach((i, k) => { this.cells[i].p = orig[k]; });
      for (let attempt = 0; attempt < 40; attempt++) {
        this.recolor(idx);
        if (!this.findMatches().length && this.hasMove()) return emit();
      }
      idx.forEach((i, k) => { orig[k].c = origColors[k]; });
      return false;
    }

    addMoves(n) {
      this.moves += n;
      if (this.status === 'lost') this.status = 'play';
      if (!this.hasMove()) this.shuffle();
    }

    // Level-end bonus: each unused move becomes a rocket that fires.
    bonus() {
      this.inBonus = true;
      let m = this.moves;
      const total = m;
      this.moves = 0;
      for (let guard = 0; m > 0 && guard < 60; guard++) {
        const gems = this.shuffleArr(this.gemCells(true));
        if (!gems.length) break;
        const picks = gems.slice(0, Math.min(m, 4));
        m -= picks.length;
        const transforms = [], queue = [];
        for (const i of picks) {
          const p = this.cells[i].p;
          p.k = this.rng() < 0.5 ? 'rh' : 'rv';
          p.c = -1;
          transforms.push({ i, id: p.id, k: p.k, d: 0 });
          this.cells[i].p = null;
          queue.push({ i, p });
        }
        this.ev({ t: 'bonus', transforms, left: m });
        this.runWaves(queue);
        this.resolve(0);
      }
      for (let k = 0; k < 6; k++) {
        const queue = [];
        for (let i = 0; i < this.cells.length; i++) {
          const x = this.cells[i];
          if (isSpecial(x.p) && !x.lock) { queue.push({ i, p: x.p }); x.p = null; }
        }
        if (!queue.length) break;
        this.ev({ t: 'bonus', transforms: [], left: 0 });
        this.runWaves(queue);
        this.resolve(0);
      }
      this.inBonus = false;
      return total;
    }

    snapshot() {
      return this.cells.map((x) => ({
        v: x.v,
        p: x.p ? { id: x.p.id, k: x.p.k, c: x.p.c } : null,
        b: x.b ? { t: x.b.t, hp: x.b.hp } : null,
        moss: x.moss,
        lock: x.lock,
      }));
    }

    clone(seed) {
      const g = Object.create(Game.prototype);
      Object.assign(g, this);
      g.cells = this.cells.map((x) => ({
        v: x.v,
        p: x.p ? { id: x.p.id, k: x.p.k, c: x.p.c } : null,
        b: x.b ? { t: x.b.t, hp: x.b.hp } : null,
        moss: x.moss,
        lock: x.lock,
      }));
      g.goals = this.goals.map((x) => ({ type: x.type, color: x.color, total: x.total, left: x.left }));
      g.rng = mulberry32(seed);
      g.rec = false;
      g.events = [];
      return g;
    }
  }

  const api = { Game, mulberry32, isSpecial, comboOf };
  root.CCEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
