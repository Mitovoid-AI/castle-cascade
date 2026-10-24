/* Castle Cascade — board view. Draws the board on a canvas and replays the
 * engine's event list as animation; also turns swipes and taps into moves. */
(function (root) {
  'use strict';
  const Art = root.CCArt, Sfx = root.CCAudio;

  const easeOut = (t) => 1 - (1 - t) * (1 - t);
  const easeIn = (t) => t * t;
  const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

  // Gravity ticks get shorter as pieces fall, which reads as acceleration.
  const TICK_MS = [0];
  for (let k = 1; k <= 420; k++) TICK_MS.push(TICK_MS[k - 1] + Math.max(46, 92 - 12 * (k - 1)));
  function msToTick(ms) {
    let k = 0;
    while (k < TICK_MS.length - 1 && TICK_MS[k + 1] <= ms) k++;
    if (k >= TICK_MS.length - 1) return k;
    return k + (ms - TICK_MS[k]) / (TICK_MS[k + 1] - TICK_MS[k]);
  }

  const COMBO_WORDS = ['', '', '', 'Sweet!', 'Great!', 'Superb!', 'Royal!', 'Majestic!', 'Legendary!'];

  class BoardView {
    constructor(canvas, hooks) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.hooks = hooks;
      this.game = null;
      this.sprites = new Map();
      this.cells = [];
      this.fx = [];
      this.particles = [];
      this.texts = [];
      this.flyers = [];
      this.tweens = [];
      this.timers = [];
      this.time = 0;
      this.speed = 1;
      this.shake = 0;
      this.sel = -1;
      this.hint = null;
      this.area = { x: 0, y: 0, w: 300, h: 300 };
      this.cs = 40;
      this.drag = null;
      this.reduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.bindInput();
      let last = performance.now();
      const loop = (now) => {
        const dt = Math.min(50, now - last);
        last = now;
        // A portal ad (window.CCPortal) pauses all board animation.
        if (!this.hidden && !(root.CCPortal && root.CCPortal.paused)) {
          this.step(dt);
          this.draw();
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    // ---------- clock ----------

    step(dt) {
      this.time += dt * this.speed;
      const t = this.time;
      if (this.timers.length) {
        const due = this.timers.filter((x) => x.at <= t);
        if (due.length) {
          this.timers = this.timers.filter((x) => x.at > t);
          for (const x of due) x.fn();
        }
      }
      for (const tw of this.tweens) {
        const k = clamp01((t - tw.t0) / tw.dur);
        tw.fn(tw.ease ? tw.ease(k) : k);
        if (k >= 1) { tw.done = true; if (tw.end) tw.end(); }
      }
      this.tweens = this.tweens.filter((x) => !x.done);
      const sdt = dt * this.speed / 1000;
      for (const p of this.particles) {
        p.vy += p.g * sdt;
        p.x += p.vx * sdt;
        p.y += p.vy * sdt;
        p.rot += p.vr * sdt;
      }
      this.particles = this.particles.filter((p) => t - p.t0 < p.life);
      this.fx = this.fx.filter((f) => t - f.t0 < f.life);
      this.texts = this.texts.filter((x) => t - x.t0 < x.life);
      const arrived = [];
      this.flyers = this.flyers.filter((f) => {
        if (t - f.t0 >= f.life) { arrived.push(f); return false; }
        return true;
      });
      for (const f of arrived) this.hooks.onGoalArrive(f.gi);
      if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 0.03);
      for (const s of this.sprites.values()) this.updateSprite(s);
    }

    at(ms, fn) { if (ms <= 0) fn(); else this.timers.push({ at: this.time + ms, fn }); }
    wait(ms) { return new Promise((res) => this.at(ms, res)); }
    tween(dur, fn, ease, end) { this.tweens.push({ t0: this.time, dur: Math.max(1, dur), fn, ease, end }); }

    // ---------- setup & layout ----------

    setGame(game) {
      this.game = game;
      this.sprites.clear();
      this.fx = []; this.particles = []; this.texts = []; this.flyers = []; this.tweens = []; this.timers = [];
      this.sel = -1; this.hint = null; this.speed = 1;
      const snap = game.snapshot();
      this.cells = snap.map((x) => ({ v: x.v, b: x.b, moss: x.moss, lock: x.lock, hitT: -1e9 }));
      snap.forEach((x, i) => { if (x.p) this.addSprite(x.p, (i / game.cols) | 0, i % game.cols); });
      this.layout();
    }

    resize(area) {
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      const box = this.cv.getBoundingClientRect();
      const W = box.width, H = box.height;
      this.dpr = dpr; this.W = W; this.H = H;
      this.cv.width = Math.round(W * dpr);
      this.cv.height = Math.round(H * dpr);
      if (area) this.area = area;
      this.layout();
    }

    layout() {
      const g = this.game;
      if (!g || !this.W) return;
      const a = this.area;
      this.cs = Math.max(20, Math.floor(Math.min((a.w - 20) / g.cols, (a.h - 20) / g.rows, 68)));
      this.bx = Math.round(a.x + (a.w - this.cs * g.cols) / 2);
      this.by = Math.round(a.y + (a.h - this.cs * g.rows) / 2);
      this.px = Math.round(this.cs * this.dpr);
      this.renderBackground();
    }

    renderBackground() {
      const g = this.game, cs = this.cs, dpr = this.dpr;
      const c = document.createElement('canvas');
      c.width = this.cv.width; c.height = this.cv.height;
      const x = c.getContext('2d');
      x.scale(dpr, dpr);
      const rr = (px, py, w, h, r) => { x.beginPath(); x.roundRect ? x.roundRect(px, py, w, h, r) : x.rect(px, py, w, h); };
      const each = (fn) => { for (let r = 0; r < g.rows; r++) for (let col = 0; col < g.cols; col++) if (!this.cells[r * g.cols + col].v) fn(r, col); };
      const m = cs * 0.14;
      x.fillStyle = 'rgba(255,214,120,0.75)';
      each((r, col) => { rr(this.bx + col * cs - m - 3, this.by + r * cs - m - 3, cs + 2 * m + 6, cs + 2 * m + 6, cs * 0.3); x.fill(); });
      x.fillStyle = '#121741';
      each((r, col) => { rr(this.bx + col * cs - m, this.by + r * cs - m, cs + 2 * m, cs + 2 * m, cs * 0.26); x.fill(); });
      each((r, col) => {
        x.fillStyle = (r + col) % 2 ? '#2b3277' : '#353d8c';
        rr(this.bx + col * cs + 1, this.by + r * cs + 1, cs - 2, cs - 2, cs * 0.14);
        x.fill();
      });
      this.bg = c;
    }

    addSprite(p, r, c) {
      const s = { id: p.id, k: p.k, c: p.c, r, col: c, sc: 1, a: 1, rot: 0, path: null, landT: -1e9, born: this.time, sy: 1 };
      this.sprites.set(p.id, s);
      return s;
    }

    updateSprite(s) {
      if (!s.path) return;
      const tau = msToTick(this.time - s.pathT0);
      const path = s.path, last = path[path.length - 1];
      if (tau >= last[2]) {
        s.r = last[0]; s.col = last[1]; s.path = null; s.landT = this.time;
        return;
      }
      let k = 0;
      while (k < path.length - 2 && path[k + 1][2] <= tau) k++;
      const p0 = path[k], p1 = path[k + 1];
      const f = p1[2] === p0[2] ? 1 : clamp01((tau - p0[2]) / (p1[2] - p0[2]));
      s.r = lerp(p0[0], p1[0], f);
      s.col = lerp(p0[1], p1[1], f);
    }

    cx(col) { return this.bx + (col + 0.5) * this.cs; }
    cy(r) { return this.by + (r + 0.5) * this.cs; }
    rc(i) { const C = this.game.cols; return [(i / C) | 0, i % C]; }

    // ---------- input ----------

    cellAt(px, py) {
      const g = this.game;
      if (!g) return -1;
      const c = Math.floor((px - this.bx) / this.cs), r = Math.floor((py - this.by) / this.cs);
      if (r < 0 || c < 0 || r >= g.rows || c >= g.cols) return -1;
      const i = r * g.cols + c;
      return this.cells[i].v ? -1 : i;
    }

    bindInput() {
      const pos = (e) => { const b = this.cv.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
      this.cv.addEventListener('pointerdown', (e) => {
        Sfx.unlock();
        if (!this.game || !this.hooks.canInput()) return;
        const [x, y] = pos(e);
        const i = this.cellAt(x, y);
        if (i < 0) { this.sel = -1; return; }
        this.hint = null;
        this.hooks.onActivity();
        if (this.hooks.boosterActive()) { this.hooks.onCell(i); return; }
        this.drag = { i, x, y };
        try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* capture is optional */ }
      });
      this.cv.addEventListener('pointermove', (e) => {
        if (!this.drag) return;
        const [x, y] = pos(e);
        const dx = x - this.drag.x, dy = y - this.drag.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cs * 0.32) return;
        const g = this.game, i = this.drag.i, [r, c] = this.rc(i);
        let j = -1;
        if (Math.abs(dx) > Math.abs(dy)) { if (dx > 0 && c < g.cols - 1) j = i + 1; else if (dx < 0 && c > 0) j = i - 1; }
        else { if (dy > 0 && r < g.rows - 1) j = i + g.cols; else if (dy < 0 && r > 0) j = i - g.cols; }
        this.drag = null;
        this.sel = -1;
        if (j >= 0 && !this.cells[j].v) this.hooks.onSwap(i, j);
      });
      const up = () => {
        if (!this.drag) return;
        const i = this.drag.i;
        this.drag = null;
        const g = this.game;
        if (this.sel >= 0 && this.sel !== i && g.adjacent(this.sel, i)) {
          const a = this.sel;
          this.sel = -1;
          this.hooks.onSwap(a, i);
          return;
        }
        const p = g.cells[i].p;
        if (p && root.CCEngine.isSpecial(p) && g.movable(i)) {
          this.sel = -1;
          this.hooks.onTap(i);
          return;
        }
        this.sel = this.sel === i || !g.movable(i) ? -1 : i;
        if (this.sel >= 0) Sfx.click();
      };
      this.cv.addEventListener('pointerup', up);
      this.cv.addEventListener('pointercancel', () => { this.drag = null; });
    }

    showHint(m) { this.hint = m ? { m, t0: this.time } : null; }

    // ---------- effects helpers ----------

    burst(x, y, color, n, opt) {
      if (this.reduced) n = Math.ceil(n / 3);
      opt = opt || {};
      for (let k = 0; k < n; k++) {
        const a = Math.random() * Math.PI * 2, sp = (opt.speed || 160) * (0.4 + Math.random());
        this.particles.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opt.up || 60), g: opt.g != null ? opt.g : 520,
          t0: this.time, life: (opt.life || 520) * (0.6 + Math.random() * 0.6), size: (opt.size || 5) * (0.6 + Math.random() * 0.8),
          color, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, shape: opt.shape || 'dot',
        });
      }
    }

    floatText(text, x, y, opt) {
      opt = opt || {};
      this.texts.push({ text, x, y, t0: this.time, life: opt.life || 1000, size: opt.size || 30, color: opt.color || '#fff1a8' });
    }

    flyGoal(gi, iconName, x, y) {
      const to = this.hooks.goalPos(gi);
      if (!to) { this.hooks.onGoalArrive(gi); return; }
      this.flyers.push({ gi, icon: iconName, x0: x, y0: y, x1: to.x, y1: to.y, t0: this.time, life: 520 + Math.random() * 160 });
    }

    // ---------- event playback ----------

    async play(events) {
      for (const ev of events) {
        switch (ev.t) {
          case 'swap': await this.playSwap(ev); break;
          case 'tap': break;
          case 'match': await this.playMatch(ev); break;
          case 'blast': await this.playBlast(ev); break;
          case 'fall': await this.playFall(ev); break;
          case 'collect': await this.playCollect(ev); break;
          case 'shuffle': await this.playShuffle(ev); break;
          case 'bonus': await this.playBonus(ev); break;
          default: break;
        }
      }
    }

    async playSwap(ev) {
      const [ra, ca] = this.rc(ev.a), [rb, cb] = this.rc(ev.b);
      const sa = this.findSpriteAt(ra, ca), sb = this.findSpriteAt(rb, cb);
      const move = (back) => new Promise((res) => {
        this.tween(130, (k) => {
          const f = back ? 1 - k : k;
          if (sa) { sa.r = lerp(ra, rb, f); sa.col = lerp(ca, cb, f); }
          if (sb) { sb.r = lerp(rb, ra, f); sb.col = lerp(cb, ca, f); }
        }, null, res);
      });
      Sfx.swap();
      await move(false);
      if (ev.back) {
        Sfx.bad();
        await move(true);
      }
    }

    findSpriteAt(r, c) {
      for (const s of this.sprites.values()) if (!s.dying && Math.abs(s.r - r) < 0.01 && Math.abs(s.col - c) < 0.01) return s;
      return null;
    }

    goalIcon(gi) {
      const g = this.game.goals[gi];
      if (!g) return null;
      return g.type === 'color' ? 'gem' + g.color : g.type === 'lock' ? 'lock' : g.type;
    }

    killSprite(s, how) {
      if (!s || s.dying) return;
      s.dying = true;
      const x = this.cx(s.col), y = this.cy(s.r);
      if (how === 'pop') {
        const col = s.k === 'g' ? Art.GEMS[s.c].base : '#ffe27a';
        this.burst(x, y, col, 9, { speed: 190, size: this.cs * 0.09, shape: 'chip' });
        this.burst(x, y, '#ffffff', 3, { speed: 90, size: this.cs * 0.06, life: 300 });
        this.tween(190, (k) => { s.sc = k < 0.3 ? 1 + k * 0.6 : (1.18 * (1 - (k - 0.3) / 0.7)); s.a = 1 - k * 0.5; }, null, () => this.sprites.delete(s.id));
      } else {
        this.tween(120, (k) => { s.sc = 1 + k * 0.4; s.a = 1 - k; }, null, () => this.sprites.delete(s.id));
      }
    }

    applyHit(h) {
      const [r, c] = this.rc(h.i), x = this.cx(c), y = this.cy(r), cell = this.cells[h.i];
      if (h.k === 'gem') {
        const s = this.sprites.get(h.id);
        if (h.into != null && s) {
          const [tr, tc] = this.rc(h.into);
          const r0 = s.r, c0 = s.col;
          s.dying = true;
          this.tween(150, (k) => { s.r = lerp(r0, tr, k); s.col = lerp(c0, tc, k); s.a = 1 - k * 0.4; }, easeIn, () => this.sprites.delete(s.id));
        } else {
          this.killSprite(s, 'pop');
        }
        if (h.gi >= 0) this.flyGoal(h.gi, 'gem' + h.c, x, y);
      } else if (h.k === 'lock') {
        cell.lock = 0;
        this.burst(x, y, '#c9d2df', 10, { speed: 170, size: this.cs * 0.08, shape: 'chip' });
        Sfx.crack();
        if (h.gi >= 0) this.flyGoal(h.gi, 'lock', x, y);
      } else if (h.k === 'moss') {
        cell.moss = h.hp;
        this.burst(x, y, '#7be05f', 7, { speed: 120, size: this.cs * 0.08, shape: 'chip' });
        if (h.gi >= 0) this.flyGoal(h.gi, 'moss', x, y);
      } else if (h.k === 'crate' || h.k === 'stone') {
        cell.b = h.hp > 0 ? { t: h.k, hp: h.hp } : null;
        cell.hitT = this.time;
        this.burst(x, y, h.k === 'crate' ? '#c47c3a' : '#8a94a3', h.hp > 0 ? 6 : 14, { speed: 200, size: this.cs * 0.1, shape: 'chip' });
        Sfx.crack();
        if (h.gi >= 0) this.flyGoal(h.gi, h.k, x, y);
      }
    }

    async playMatch(ev) {
      Sfx.pop(ev.combo);
      this.hooks.haptic(12);
      let maxD = 0;
      for (const h of ev.hits) { maxD = Math.max(maxD, h.d || 0); this.at(h.d || 0, () => this.applyHit(h)); }
      if (ev.combo >= 3) {
        const word = COMBO_WORDS[Math.min(ev.combo, COMBO_WORDS.length - 1)];
        this.floatText(word, this.bx + this.cs * this.game.cols / 2, this.by + this.cs * this.game.rows * 0.42, { size: Math.min(46, this.cs * 0.9), life: 1100 });
        this.hooks.onCombo(ev.combo);
      }
      if (ev.created.length) {
        this.at(160, () => {
          for (const cr of ev.created) {
            const [r, c] = this.rc(cr.i);
            const s = this.addSprite({ id: cr.id, k: cr.k, c: -1 }, r, c);
            s.sc = 0;
            this.tween(320, (k) => { s.sc = k; }, easeOutBack);
            this.burst(this.cx(c), this.cy(r), '#fff5b0', 12, { speed: 150, size: this.cs * 0.07, shape: 'star', g: 120 });
          }
          Sfx.special();
        });
      }
      await this.wait(Math.max(maxD, ev.created.length ? 200 : 0) + 230);
    }

    async playBlast(ev) {
      let maxD = 0;
      for (const id of ev.removed) {
        const s = this.sprites.get(id);
        if (s) {
          this.burst(this.cx(s.col), this.cy(s.r), '#ffffff', 8, { speed: 140, size: this.cs * 0.07, g: 100 });
          this.killSprite(s, 'launch');
        }
      }
      let big = false;
      for (const f of ev.fx) {
        maxD = Math.max(maxD, f.d || 0);
        this.startFx(f);
        if (f.t === 'tnt' || f.t === 'nova') big = true;
      }
      for (const h of ev.hits) { maxD = Math.max(maxD, h.d || 0); this.at(h.d || 0, () => this.applyHit(h)); }
      for (const tf of ev.transforms) {
        maxD = Math.max(maxD, tf.d || 0);
        this.at(tf.d || 0, () => {
          const s = this.sprites.get(tf.id);
          if (s) { s.k = tf.k; s.c = -1; s.sc = 0.4; this.tween(220, (k) => { s.sc = 0.4 + 0.6 * k; }, easeOutBack); }
          const [r, c] = this.rc(tf.i);
          this.burst(this.cx(c), this.cy(r), '#fff5b0', 6, { speed: 110, size: this.cs * 0.07, shape: 'star', g: 100 });
        });
      }
      this.hooks.haptic(big ? 40 : 20);
      await this.wait(maxD + 260);
    }

    startFx(f) {
      const [r, c] = this.rc(f.i), x = this.cx(c), y = this.cy(r), cs = this.cs;
      const t0 = this.time + (f.d || 0);
      if (f.t === 'rocket' || f.t === 'arrow' || f.t === 'cannon') {
        const span = Math.max(this.game.cols, this.game.rows) + 2;
        const dir = f.t === 'arrow' ? 'h' : f.t === 'cannon' ? 'v' : f.dir;
        this.fx.push({ t: f.t, x, y, dir, t0, life: span * 34 + 160, big: f.big });
        this.at(f.d || 0, () => Sfx.rocket());
      } else if (f.t === 'tnt') {
        this.fx.push({ t: 'ring', x, y, t0, life: 420, rad: (f.rad + 0.6) * cs, color: '#ffb347' });
        this.fx.push({ t: 'flash', x, y, t0, life: 260, rad: (f.rad + 0.4) * cs });
        this.at(f.d || 0, () => { Sfx.boom(f.rad > 2); this.shake = Math.max(this.shake, f.rad > 2 ? 12 : 8); this.burst(x, y, '#ffcf6b', 18, { speed: 320, size: cs * 0.1, g: 300 }); });
      } else if (f.t === 'prop') {
        const [tr, tc] = this.rc(f.to);
        this.fx.push({ t: 'prop', x, y, x1: this.cx(tc), y1: this.cy(tr), t0, life: 380, carry: f.carry });
        this.at(f.d || 0, () => Sfx.prop());
      } else if (f.t === 'ball') {
        const pts = f.targets.map((j, k) => { const [rr, cc] = this.rc(j); return { x: this.cx(cc), y: this.cy(rr), d: 140 + Math.min(k, 30) * 22 }; });
        this.fx.push({ t: 'ball', x, y, pts, t0, life: 140 + Math.min(pts.length, 31) * 22 + 320 });
        this.at(f.d || 0, () => Sfx.zap());
      } else if (f.t === 'nova') {
        this.fx.push({ t: 'flash', x, y, t0, life: 600, rad: cs * 12 });
        this.fx.push({ t: 'ring', x, y, t0, life: 700, rad: cs * 12, color: '#ffffff' });
        this.at(f.d || 0, () => { Sfx.boom(true); Sfx.zap(); this.shake = 16; });
      } else if (f.t === 'hammer') {
        this.fx.push({ t: 'hammer', x, y, t0, life: 300 });
        this.at(220, () => { Sfx.boom(false); this.shake = Math.max(this.shake, 6); });
      }
    }

    async playFall(ev) {
      for (const m of ev.moves) {
        let s = this.sprites.get(m.id);
        if (!s) s = this.addSprite(m.p, m.path[0][0], m.path[0][1]);
        s.path = m.path;
        s.pathT0 = this.time;
      }
      await this.wait(TICK_MS[Math.min(ev.T, TICK_MS.length - 1)] + 70);
    }

    async playCollect(ev) {
      const s = this.sprites.get(ev.id);
      const [r, c] = this.rc(ev.i);
      Sfx.collect();
      if (s) {
        s.dying = true;
        this.tween(260, (k) => { s.sc = 1 + 0.4 * Math.sin(k * Math.PI); s.a = 1 - k; }, null, () => this.sprites.delete(s.id));
      }
      this.burst(this.cx(c), this.cy(r), '#ffe27a', 16, { speed: 220, size: this.cs * 0.08, shape: 'star', g: 200 });
      if (ev.gi >= 0) this.flyGoal(ev.gi, 'relic', this.cx(c), this.cy(r));
      await this.wait(220);
    }

    async playShuffle(ev) {
      const moves = [];
      for (const it of ev.items) {
        const s = this.sprites.get(it.id);
        if (!s) continue;
        const [r, c] = this.rc(it.i);
        moves.push({ s, r0: s.r, c0: s.col, r1: r, c1: c, cNew: it.c });
      }
      const midR = this.game.rows / 2 - 0.5, midC = this.game.cols / 2 - 0.5;
      this.floatText('Shuffle!', this.bx + this.cs * this.game.cols / 2, this.by + this.cs * this.game.rows / 2, { size: 34, life: 900 });
      await new Promise((res) => this.tween(320, (k) => {
        for (const m of moves) { m.s.r = lerp(m.r0, midR, k); m.s.col = lerp(m.c0, midC, k); m.s.sc = 1 - 0.5 * k; }
      }, easeIn, res));
      for (const m of moves) m.s.c = m.cNew;
      await new Promise((res) => this.tween(380, (k) => {
        for (const m of moves) { m.s.r = lerp(midR, m.r1, k); m.s.col = lerp(midC, m.c1, k); m.s.sc = 0.5 + 0.5 * k; }
      }, easeOut, res));
    }

    async playBonus(ev) {
      for (const tf of ev.transforms) {
        const s = this.sprites.get(tf.id);
        if (s) { s.k = tf.k; s.c = -1; s.sc = 0.3; this.tween(240, (k) => { s.sc = 0.3 + 0.7 * k; }, easeOutBack); }
        const [r, c] = this.rc(tf.i);
        this.burst(this.cx(c), this.cy(r), '#fff5b0', 8, { speed: 130, size: this.cs * 0.07, shape: 'star', g: 120 });
      }
      this.hooks.onBonusTick(ev.left, ev.transforms.length);
      if (ev.transforms.length) Sfx.special();
      await this.wait(300);
    }

    // ---------- drawing ----------

    draw() {
      const ctx = this.ctx, g = this.game;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, this.cv.width, this.cv.height);
      if (!g || !this.bg) return;
      const dpr = this.dpr, cs = this.cs, t = this.time;
      let sx = 0, sy = 0;
      if (this.shake > 0 && !this.reduced) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
      ctx.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
      ctx.drawImage(this.bg, 0, 0, this.W, this.H);

      const C = g.cols;
      // moss under pieces
      for (let i = 0; i < this.cells.length; i++) {
        const x = this.cells[i];
        if (x.v || !x.moss) continue;
        const r = (i / C) | 0, c = i % C;
        ctx.drawImage(Art.moss(x.moss, this.px), this.bx + c * cs + 1, this.by + r * cs + 1, cs - 2, cs - 2);
      }
      // selection & hint
      if (this.sel >= 0) this.glowCell(this.sel, 'rgba(255,240,170,0.55)', 1);
      if (this.hint && t - this.hint.t0 < 60000) {
        const pulse = 0.35 + 0.35 * Math.sin((t - this.hint.t0) / 160);
        const m = this.hint.m;
        if (m.tap != null) this.glowCell(m.tap, 'rgba(255,255,255,' + pulse + ')', 1);
        else { this.glowCell(m.a, 'rgba(255,255,255,' + pulse + ')', 1); this.glowCell(m.b, 'rgba(255,255,255,' + pulse + ')', 1); }
      }
      // pieces
      const size = cs * 0.9;
      for (const s of this.sprites.values()) {
        let x = this.cx(s.col), y = this.cy(s.r);
        let w = size * s.sc, h = size * s.sc;
        const sinceLand = t - s.landT;
        if (sinceLand < 140) { const q = Math.sin(sinceLand / 140 * Math.PI) * 0.12; h *= 1 - q; w *= 1 + q * 0.6; y += size * q * 0.45; }
        if (this.hint && this.hint.m && !s.dying && s.k === 'g') {
          const m = this.hint.m, i = Math.round(s.r) * C + Math.round(s.col);
          if ((m.a === i || m.b === i) && Math.abs(s.r - Math.round(s.r)) < 0.01) {
            const other = m.a === i ? m.b : m.a;
            const dr = Math.floor(other / C) - Math.floor(i / C), dc = (other % C) - (i % C);
            const k = Math.max(0, Math.sin((t - this.hint.t0) / 110)) * cs * 0.08;
            x += dc * k; y += dr * k;
          }
        }
        const colIdx = Math.max(0, Math.min(C - 1, Math.round(s.col)));
        const above = s.r < g.top[colIdx] - 0.001;
        if (above) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(this.bx + colIdx * cs - cs * 0.2, this.by + g.top[colIdx] * cs, cs * 1.4, cs * (g.rows + 2));
          ctx.clip();
        }
        if (s.a < 1) ctx.globalAlpha = Math.max(0, s.a);
        if (s.k !== 'g') this.drawSpecialGlow(s, x, y, t);
        const img = Art.piece(s, this.px);
        if (s.k === 'lb' || s.k === 'pr') {
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(s.k === 'lb' ? Math.sin(t / 700) * 0.35 : Math.sin(t / 300) * 0.15);
          if (s.k === 'pr') ctx.scale(1 + 0.06 * Math.sin(t / 45 + s.id), 1);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        } else {
          ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
        }
        ctx.globalAlpha = 1;
        if (above) ctx.restore();
      }
      // locks and blockers on top
      for (let i = 0; i < this.cells.length; i++) {
        const x = this.cells[i];
        if (x.v) continue;
        const r = (i / C) | 0, c = i % C;
        const px = this.bx + c * cs, py = this.by + r * cs;
        if (x.lock) ctx.drawImage(Art.lock(this.px), px, py, cs, cs);
        if (x.b) {
          const since = t - x.hitT;
          let k = 1;
          if (since < 220) k = 1 + 0.12 * Math.sin(since / 220 * Math.PI);
          const w = cs * 0.96 * k;
          const img = x.b.t === 'crate' ? Art.crate(x.b.hp, this.px) : Art.stone(this.px);
          ctx.drawImage(img, px + cs / 2 - w / 2, py + cs / 2 - w / 2, w, w);
        }
      }
      this.drawFx(ctx, t);
      // particles
      for (const p of this.particles) {
        const k = (t - p.t0) / p.life;
        ctx.globalAlpha = Math.max(0, 1 - k * k);
        ctx.fillStyle = p.color;
        if (p.shape === 'chip') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
          ctx.restore();
        } else if (p.shape === 'star') {
          this.starPath(ctx, p.x, p.y, p.size, p.rot); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // flying goal icons
      for (const f of this.flyers) {
        const k = clamp01((t - f.t0) / f.life), e = easeIn(k);
        const mx = (f.x0 + f.x1) / 2 + (f.x0 < f.x1 ? -40 : 40), my = Math.min(f.y0, f.y1) - 60;
        const x = (1 - e) * (1 - e) * f.x0 + 2 * (1 - e) * e * mx + e * e * f.x1;
        const y = (1 - e) * (1 - e) * f.y0 + 2 * (1 - e) * e * my + e * e * f.y1;
        const w = cs * (0.75 - 0.3 * k);
        ctx.drawImage(Art.icon(f.icon, this.px), x - w / 2, y - w / 2, w, w);
      }
      // words
      for (const x of this.texts) {
        const k = (t - x.t0) / x.life;
        const sc = k < 0.15 ? easeOutBack(k / 0.15) : 1;
        ctx.save();
        ctx.translate(x.x, x.y - k * 30);
        ctx.scale(sc, sc);
        ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
        ctx.font = '400 ' + x.size + 'px "Lilita One", "Arial Black", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineWidth = x.size * 0.22;
        ctx.strokeStyle = '#3b1060';
        ctx.strokeText(x.text, 0, 0);
        ctx.fillStyle = x.color;
        ctx.fillText(x.text, 0, 0);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }

    glowCell(i, color, scale) {
      const ctx = this.ctx, cs = this.cs, [r, c] = this.rc(i);
      ctx.fillStyle = color;
      ctx.beginPath();
      const pad = cs * (1 - scale) / 2;
      ctx.roundRect ? ctx.roundRect(this.bx + c * cs + 2 + pad, this.by + r * cs + 2 + pad, cs - 4 - 2 * pad, cs - 4 - 2 * pad, cs * 0.18) : ctx.rect(this.bx + c * cs, this.by + r * cs, cs, cs);
      ctx.fill();
    }

    drawSpecialGlow(s, x, y, t) {
      const ctx = this.ctx, cs = this.cs;
      const pulse = 0.25 + 0.12 * Math.sin(t / 220 + s.id);
      const g = ctx.createRadialGradient(x, y, cs * 0.1, x, y, cs * 0.62);
      g.addColorStop(0, 'rgba(255,245,180,' + pulse + ')');
      g.addColorStop(1, 'rgba(255,245,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - cs * 0.62, y - cs * 0.62, cs * 1.24, cs * 1.24);
    }

    starPath(ctx, x, y, r, rot) {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const rr = k % 2 ? r * 0.45 : r, a = rot + k * Math.PI / 5;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    }

    drawFx(ctx, t) {
      const cs = this.cs;
      for (const f of this.fx) {
        const e = t - f.t0;
        if (e < 0) continue;
        if (f.t === 'rocket' || f.t === 'arrow' || f.t === 'cannon') {
          const dist = e / 34 * cs;
          const sides = f.t === 'rocket' ? [-1, 1] : [1];
          for (const side of sides) {
            let ox = f.x, oy = f.y;
            if (f.t === 'arrow') ox = this.bx - cs * 0.5;
            if (f.t === 'cannon') oy = this.by - cs * 0.5;
            const hx = f.dir === 'h' ? ox + side * dist : ox, hy = f.dir === 'v' ? oy + side * dist : oy;
            const alpha = Math.max(0, 1 - e / f.life);
            // Comets leave a cyan trail, the lance a gold one, the anvil a dust streak.
            const tint = f.t === 'rocket' ? '150,230,255' : f.t === 'cannon' ? '205,210,225' : '255,220,120';
            const grad = ctx.createLinearGradient(ox, oy, hx, hy);
            grad.addColorStop(0, 'rgba(' + tint + ',0)');
            grad.addColorStop(1, 'rgba(' + tint + ',' + (0.85 * alpha) + ')');
            ctx.strokeStyle = grad;
            ctx.lineWidth = cs * (f.big ? 0.7 : 0.42);
            ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(hx, hy); ctx.stroke();
            if (f.t === 'cannon') {
              const w = cs * 1.05;
              ctx.drawImage(Art.icon('cannon', this.px), hx - w / 2, hy - w / 2, w, w);
            } else {
              ctx.save();
              ctx.translate(hx, hy);
              ctx.rotate(f.dir === 'h' ? (side > 0 ? 0 : Math.PI) : (side > 0 ? Math.PI / 2 : -Math.PI / 2));
              const w = cs * (f.t === 'rocket' ? 1.05 : 0.95);
              ctx.drawImage(Art.icon(f.t === 'arrow' ? 'arrow' : 'cometHead', this.px), -w / 2, -w / 2, w, w);
              ctx.restore();
            }
          }
        } else if (f.t === 'ring') {
          const k = e / f.life;
          ctx.strokeStyle = f.color;
          ctx.globalAlpha = 1 - k;
          ctx.lineWidth = cs * 0.25 * (1 - k) + 2;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.rad * easeOut(k), 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (f.t === 'flash') {
          const k = e / f.life;
          const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.rad * (0.6 + 0.4 * k));
          g.addColorStop(0, 'rgba(255,255,230,' + (0.9 * (1 - k)) + ')');
          g.addColorStop(0.5, 'rgba(255,200,90,' + (0.5 * (1 - k)) + ')');
          g.addColorStop(1, 'rgba(255,140,40,0)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.rad, 0, Math.PI * 2); ctx.fill();
        } else if (f.t === 'prop') {
          const k = clamp01(e / f.life), q = easeOut(k);
          const mx = (f.x + f.x1) / 2, my = Math.min(f.y, f.y1) - cs * 2.2;
          const x = (1 - q) * (1 - q) * f.x + 2 * (1 - q) * q * mx + q * q * f.x1;
          const y = (1 - q) * (1 - q) * f.y + 2 * (1 - q) * q * my + q * q * f.y1;
          // The dragonfly faces along its flight path, wings fluttering.
          const dx = 2 * (1 - q) * (mx - f.x) + 2 * q * (f.x1 - mx), dy = 2 * (1 - q) * (my - f.y) + 2 * q * (f.y1 - my);
          const w = cs * (0.95 + 0.3 * Math.sin(k * Math.PI));
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.atan2(dy, dx) + Math.PI / 2);
          ctx.scale(1 + 0.18 * Math.sin(e / 18), 1);
          ctx.drawImage(Art.icon('pr', this.px), -w / 2, -w / 2, w, w);
          ctx.restore();
          if (f.carry) {
            const cw = cs * 0.6;
            ctx.drawImage(Art.piece({ k: f.carry, c: -1 }, this.px), x - cw / 2, y - cw * 0.2, cw, cw);
          }
        } else if (f.t === 'ball') {
          const pulse = 1 + 0.15 * Math.sin(e / 40);
          const w = cs * 1.1 * pulse;
          ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(e / 120);
          ctx.globalAlpha = Math.max(0, 1 - Math.max(0, e - f.life + 200) / 200);
          ctx.drawImage(Art.icon('lb', this.px), -w / 2, -w / 2, w, w);
          ctx.restore();
          ctx.globalAlpha = 1;
          ctx.lineWidth = 2.5;
          for (const p of f.pts) {
            const pe = e - p.d + 120;
            if (pe < 0 || pe > 260) continue;
            ctx.strokeStyle = 'rgba(220,240,255,' + (1 - pe / 260) + ')';
            ctx.beginPath();
            ctx.moveTo(f.x, f.y);
            const n = 6;
            for (let s = 1; s < n; s++) {
              const q = s / n;
              ctx.lineTo(lerp(f.x, p.x, q) + (Math.random() - 0.5) * cs * 0.35, lerp(f.y, p.y, q) + (Math.random() - 0.5) * cs * 0.35);
            }
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }
        } else if (f.t === 'hammer') {
          const k = clamp01(e / 220);
          ctx.save();
          ctx.translate(f.x + cs * 0.5, f.y - cs * 0.3);
          ctx.rotate(-1.3 + 1.3 * easeIn(k));
          const w = cs * 1.3;
          ctx.drawImage(Art.icon('hammer', this.px), -w * 0.75, -w * 0.5, w, w);
          ctx.restore();
        }
      }
    }
  }

  root.CCBoard = BoardView;
})(window);
