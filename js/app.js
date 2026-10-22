/* Castle Cascade — screens, progression and rewards. */
(function () {
  'use strict';
  const E = window.CCEngine, LV = window.CCLevels, Art = window.CCArt, Sfx = window.CCAudio;
  const $ = (s) => document.querySelector(s);
  const fmtN = (n) => Math.round(n).toLocaleString('en-US');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const icon = (name, cls) => '<img class="' + (cls || 'ic') + '" alt="" src="' + Art.iconURL(name) + '">';

  // ---------- economy ----------

  const LIFE_MS = 30 * 60 * 1000;
  const MAX_LIVES = 5;
  const PRICE = { rocket: 200, tnt: 300, lb: 450, hammer: 400, arrow: 350, cannon: 350, shuffle: 250 };
  const REFILL_PRICE = 300;
  const EXTRA_MOVES_PRICE = [400, 700, 1000];
  const LEVEL_COINS = [30, 75, 150];
  const BONUS_COIN_PER_MOVE = 5;
  const CHEST_EVERY = 10;
  const UNLOCKS = [[7, 'rocket'], [9, 'tnt'], [11, 'hammer'], [13, 'lb'], [15, 'arrow'], [18, 'cannon'], [21, 'shuffle']];
  const PRE = ['rocket', 'tnt', 'lb'];
  const INGAME = ['hammer', 'arrow', 'cannon', 'shuffle'];
  const INFO = {
    rocket: { name: 'Comet', icon: 'rocket', desc: 'Start the level with a comet already on the board.' },
    tnt: { name: 'Powder Keg', icon: 'tnt', desc: 'Start the level with a powder keg already on the board.' },
    lb: { name: 'Prism', icon: 'lb', desc: 'Start the level with a prism already on the board.' },
    hammer: { name: 'Mallet', icon: 'hammer', desc: 'Smash any one tile. Does not use a move.' },
    arrow: { name: 'Lance', icon: 'arrow', desc: 'Clear a whole row. Does not use a move.' },
    cannon: { name: 'Anvil', icon: 'cannon', desc: 'Drop it to clear a whole column. Does not use a move.' },
    shuffle: { name: 'Shuffle', icon: 'shuffle', desc: 'Mix up every piece. Does not use a move.' },
  };
  const DAILY = [
    { coins: 100 }, { hammer: 1 }, { coins: 200 }, { rocket: 1, tnt: 1 },
    { coins: 300 }, { lb: 1, arrow: 1 }, { coins: 1000, unlimited: 60 },
  ];
  const COSTS = [1, 1, 2, 2, 2, 3];
  const SLOTS = [[20, 74], [50, 82], [80, 74], [22, 40], [78, 40], [50, 50]];
  const AREAS = [
    { name: 'Throne Hall', wall: '#5a2a85', floor: '#7a4a26', items: [['Grand throne', '🪑'], ['Royal banner', '🚩'], ['Candelabra', '🕯️'], ["King's portrait", '🖼️'], ['Suit of armour', '🛡️'], ['Crown pedestal', '👑']] },
    { name: 'Rose Garden', wall: '#2f7a4a', floor: '#5f7f2f', items: [['Oak tree', '🌳'], ['Tulip bed', '🌷'], ['Fountain', '⛲'], ['Rose arch', '🌹'], ['Swan pond', '🦢'], ['Sunflowers', '🌻']] },
    { name: 'Royal Kitchen', wall: '#8a4b2a', floor: '#5c3a24', items: [['Bread oven', '🍞'], ['Stew pot', '🍲'], ['Cheese wheel', '🧀'], ['Honey jars', '🍯'], ['Fruit basket', '🧺'], ['Feast cake', '🎂']] },
    { name: 'Grand Library', wall: '#3a2f6b', floor: '#5a3a20', items: [['Bookshelf', '📚'], ['Globe', '🌐'], ['Map table', '🗺️'], ['Quill desk', '🪶'], ['Telescope', '🔭'], ['Hourglass', '⏳']] },
    { name: 'Stables', wall: '#7a5a2a', floor: '#6b4a1f', items: [['Hay bales', '🌾'], ['Water trough', '🪣'], ['Cart wheel', '🛞'], ['Carrot barrel', '🥕'], ['Pony', '🐴'], ['Champion horse', '🐎']] },
    { name: 'Ballroom', wall: '#7a2a5a', floor: '#8a6a3a', items: [['Violin', '🎻'], ['Trumpet', '🎺'], ['Bouquets', '💐'], ['Music stand', '🎼'], ['Mirror ball', '🪩'], ['Grand piano', '🎹']] },
    { name: 'Wizard Tower', wall: '#2a2f6b', floor: '#3a2a5a', items: [['Crystal ball', '🔮'], ['Potion shelf', '🧪'], ['Old scrolls', '📜'], ['Wise owl', '🦉'], ['Moon window', '🌙'], ['Magic wand', '🪄']] },
    { name: 'Treasury', wall: '#6b5a1a', floor: '#4a3a1a', items: [['Coin stacks', '🪙'], ['Gold sacks', '💰'], ['Gem chest', '💎'], ['Golden key', '🗝️'], ['Trophy', '🏆'], ['Crown jewels', '👑']] },
    { name: 'Harbour', wall: '#1f5a7a', floor: '#6b4a2a', items: [['Anchor', '⚓'], ['Fish stall', '🐟'], ['Crab pots', '🦀'], ['Compass', '🧭'], ['Sailboat', '⛵'], ['Royal ship', '🚢']] },
    { name: 'Chapel', wall: '#4a4a7a', floor: '#6a6a8a', items: [['Bell', '🔔'], ['Doves', '🕊️'], ['Candles', '🕯️'], ['Blossoms', '🌸'], ['Organ', '🎶'], ['Stained window', '🪟']] },
    { name: 'Armoury', wall: '#4a3a3a', floor: '#3a2a2a', items: [['Swords', '⚔️'], ['Shields', '🛡️'], ['Bow rack', '🏹'], ['Battle axe', '🪓'], ['Dragon banner', '🐉'], ['Castle model', '🏰']] },
    { name: 'Winter Lodge', wall: '#2a5a7a', floor: '#7a8a9a', items: [['Fireplace', '🔥'], ['Snow window', '❄️'], ['Hot cocoa', '☕'], ['Scarf rack', '🧣'], ['Pine tree', '🌲'], ['Sled', '🛷']] },
  ];
  const ROMAN = ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];

  // ---------- profile ----------

  // [emoji, ring colour, levels beaten needed to unlock]
  const AVATARS = [
    ['👑', '#ffcf3f', 0], ['🦁', '#ff8124', 0], ['🐉', '#2fc95a', 0], ['🦄', '#a955ff', 0], ['🦊', '#ff3b55', 0], ['🐻', '#a0632c', 0],
    ['🧙', '#2f86ff', 25], ['🦉', '#7a5a9a', 50], ['🐺', '#5d6878', 100], ['🦅', '#d39a00', 200], ['🐲', '#e8364d', 400], ['🏰', '#8a3cc4', 800],
  ];
  const RANKS = [[0, 'Peasant'], [10, 'Squire'], [30, 'Knight'], [75, 'Baron'], [150, 'Viscount'], [300, 'Earl'], [500, 'Duke'], [800, 'Archduke'], [1200, 'Royal Heir'], [1500, 'Monarch']];
  const TIER_REWARD = [100, 250, 500, 1000, 2000, 3000, 5000];
  const ACH = [
    { id: 'climb', title: 'Kingdom Climber', icon: 'star', get: () => S.level - 1, tiers: [10, 50, 100, 250, 500, 1000, 1500], desc: (t) => 'Beat ' + fmtN(t) + ' levels' },
    { id: 'rocket', title: 'Comet Chaser', icon: 'rocket', get: () => S.stats.rocket, tiers: [10, 50, 250, 1000, 5000], desc: (t) => 'Make ' + fmtN(t) + ' comets' },
    { id: 'prop', title: 'Dragonfly Keeper', icon: 'pr', get: () => S.stats.prop, tiers: [10, 50, 250, 1000, 5000], desc: (t) => 'Hatch ' + fmtN(t) + ' dragonflies' },
    { id: 'tnt', title: 'Powder Master', icon: 'tnt', get: () => S.stats.tnt, tiers: [10, 50, 250, 1000, 5000], desc: (t) => 'Make ' + fmtN(t) + ' powder kegs' },
    { id: 'lb', title: 'Prism Maker', icon: 'lb', get: () => S.stats.lb, tiers: [5, 25, 100, 500, 2000], desc: (t) => 'Make ' + fmtN(t) + ' prisms' },
    { id: 'combo', title: 'Combo Royalty', icon: 'shuffle', get: () => S.stats.combos, tiers: [5, 25, 100, 500, 2000], desc: (t) => 'Swap two boosters together ' + fmtN(t) + ' times' },
    { id: 'cascade', title: 'Cascade King', icon: 'gem4', get: () => S.stats.bestCascade, tiers: [4, 6, 8, 10, 12], desc: (t) => 'Set off a ' + t + '-step cascade' },
    { id: 'crate', title: 'Crate Crusher', icon: 'crate', get: () => S.stats.crate, tiers: [50, 250, 1000, 5000, 20000], desc: (t) => 'Smash ' + fmtN(t) + ' crates' },
    { id: 'moss', title: 'Royal Gardener', icon: 'moss', get: () => S.stats.moss, tiers: [50, 250, 1000, 5000, 20000], desc: (t) => 'Clear ' + fmtN(t) + ' moss tiles' },
    { id: 'lock', title: 'Chain Breaker', icon: 'lock', get: () => S.stats.lock, tiers: [25, 100, 500, 2000, 8000], desc: (t) => 'Break ' + fmtN(t) + ' chains' },
    { id: 'stone', title: 'Stonemason', icon: 'stone', get: () => S.stats.stone, tiers: [10, 50, 200, 1000, 4000], desc: (t) => 'Shatter ' + fmtN(t) + ' stones' },
    { id: 'relic', title: 'Crown Keeper', icon: 'relic', get: () => S.stats.relic, tiers: [10, 50, 200, 1000, 4000], desc: (t) => 'Bring down ' + fmtN(t) + ' crowns' },
    { id: 'streak', title: 'Hot Streak', icon: 'heart', get: () => S.stats.bestStreak, tiers: [3, 5, 10, 20, 50], desc: (t) => 'Win ' + t + ' levels in a row' },
    { id: 'first', title: 'Sharp Mind', icon: 'arrow', get: () => S.stats.firstTry, tiers: [10, 50, 200, 500, 1000], desc: (t) => 'Win ' + fmtN(t) + ' levels on the first try' },
    { id: 'hard', title: 'Brave Heart', icon: 'hammer', get: () => S.stats.hardWins, tiers: [1, 5, 20, 50, 100], desc: (t) => 'Beat ' + t + ' hard level' + (t > 1 ? 's' : '') },
    { id: 'super', title: 'Iron Will', icon: 'cannon', get: () => S.stats.superWins, tiers: [1, 3, 10, 20, 30], desc: (t) => 'Beat ' + t + ' super hard level' + (t > 1 ? 's' : '') },
    { id: 'areas', title: 'Architect', icon: 'chestOpen', get: () => S.stats.areas, tiers: [1, 3, 10, 25, 50, 100], desc: (t) => 'Restore ' + t + ' castle room' + (t > 1 ? 's' : '') },
    { id: 'chests', title: 'Treasure Hunter', icon: 'chest', get: () => S.stats.chests, tiers: [1, 5, 25, 100, 300], desc: (t) => 'Open ' + t + ' chest' + (t > 1 ? 's' : '') },
    { id: 'daily', title: 'Loyal Subject', icon: 'coin', get: () => S.stats.dailies, tiers: [1, 7, 30, 100, 365], desc: (t) => 'Claim ' + t + ' daily gift' + (t > 1 ? 's' : '') },
  ];

  // ---------- save ----------

  const SAVE_KEY = 'castle-cascade-save-v1';
  const fresh = () => ({
    v: 1, level: 1, coins: 1000, stars: 0, lives: MAX_LIVES, lifeTs: Date.now(), unlimitedUntil: 0,
    inv: { rocket: 0, tnt: 0, lb: 0, hammer: 0, arrow: 0, cannon: 0, shuffle: 0 },
    unlocked: {}, streak: 0, chest: 0, area: 0, built: 0, daily: { last: '', day: 0 },
    sound: true, haptics: true, wins: 0, plays: 0, ts: Date.now(),
    profile: { name: '', avatar: 0 },
    stats: {
      bestStreak: 0, hardWins: 0, superWins: 0, firstTry: 0, rocket: 0, prop: 0, tnt: 0, lb: 0,
      combos: 0, ballCombos: 0, crate: 0, moss: 0, lock: 0, stone: 0, relic: 0, bestCascade: 0,
      boosters: 0, chests: 0, coinsEarned: 0, areas: 0, dailies: 0,
    },
    ach: {}, achSeen: {}, attempt: { level: 0, n: 0 },
  });
  function normalize(x) {
    const d = fresh();
    const s = Object.assign(d, x || {});
    s.inv = Object.assign(fresh().inv, (x && x.inv) || {});
    s.daily = Object.assign({ last: '', day: 0 }, (x && x.daily) || {});
    s.unlocked = Object.assign({}, (x && x.unlocked) || {});
    s.profile = Object.assign(fresh().profile, (x && x.profile) || {});
    s.stats = Object.assign(fresh().stats, (x && x.stats) || {});
    s.ach = Object.assign({}, (x && x.ach) || {});
    s.achSeen = Object.assign({}, (x && x.achSeen) || {});
    s.attempt = Object.assign({ level: 0, n: 0 }, (x && x.attempt) || {});
    return s;
  }
  function loadLocal() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* storage unavailable: play without saving */ }
    return fresh();
  }
  let S = loadLocal();
  function save() {
    S.ts = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ }
    Cloud.push();
  }

  // Signed-in players also get a private cloud save, so progress follows them.
  const Cloud = {
    doc: null, timer: 0, off: false,
    async init() {
      const cl = window.claude;
      if (!cl || typeof cl.use !== 'function') return;
      try {
        const [db, user] = await Promise.all([cl.use('db'), cl.use('user')]);
        if (!db || !user) return;
        const id = await user.id();
        if (!id) return;
        this.doc = db.doc('data/users/' + id + '/progress');
        const snap = await this.doc.get();
        const remote = snap.exists ? snap.data() : null;
        if (remote && (remote.level > S.level || (remote.level === S.level && remote.ts > S.ts)) && screen === 'home') {
          S = normalize(JSON.parse(JSON.stringify(remote)));
          try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
          renderHome();
          toast('Progress restored from your account');
        } else {
          this.push(true);
        }
      } catch (e) {
        this.doc = null;
      }
    },
    push(now) {
      if (!this.doc || this.off) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.doc.set(JSON.parse(JSON.stringify(S))).catch((e) => {
          if (e && ['invalid_argument', 'not_granted', 'revoked', 'quota_exceeded'].includes(e.code)) this.off = true;
        });
      }, now ? 0 : 2500);
    },
  };

  // ---------- lives ----------

  const unlimited = () => Date.now() < S.unlimitedUntil;
  function tickLives() {
    const now = Date.now();
    if (S.lives >= MAX_LIVES) { S.lifeTs = now; return; }
    while (S.lives < MAX_LIVES && now - S.lifeTs >= LIFE_MS) { S.lives++; S.lifeTs += LIFE_MS; }
    if (S.lives >= MAX_LIVES) S.lifeTs = now;
  }
  function loseLife() {
    if (unlimited()) return;
    tickLives();
    if (S.lives >= MAX_LIVES) S.lifeTs = Date.now();
    S.lives = Math.max(0, S.lives - 1);
  }
  function fmtTime(ms) {
    ms = Math.max(0, ms);
    const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const two = (x) => String(x).padStart(2, '0');
    return h ? h + ':' + two(m) + ':' + two(sec) : m + ':' + two(sec);
  }
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- achievements & ranks ----------

  const TIER_NAMES = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  function achState(a) {
    const value = a.get();
    let reached = 0;
    while (reached < a.tiers.length && value >= a.tiers[reached]) reached++;
    return { value, reached, claimed: Math.min(S.ach[a.id] || 0, reached), max: a.tiers.length };
  }
  function claimable() {
    let n = 0;
    for (const a of ACH) { const s = achState(a); n += s.reached - s.claimed; }
    return n;
  }
  function updateAchDot() { $('#achDot').hidden = claimable() === 0; }
  // Announce each newly reached tier once.
  function checkAchievements() {
    const fresh = [];
    for (const a of ACH) {
      const s = achState(a);
      if (s.reached > (S.achSeen[a.id] || 0)) {
        fresh.push(a.title + ' ' + TIER_NAMES[s.reached - 1]);
        S.achSeen[a.id] = s.reached;
      }
    }
    if (fresh.length) {
      save();
      toast(fresh.length === 1 ? 'Achievement unlocked: ' + fresh[0] + '. Claim it in your profile.' : fresh.length + ' achievements unlocked. Claim them in your profile.');
    }
    updateAchDot();
  }
  function rankOf(beaten) {
    let k = 0;
    while (k < RANKS.length - 1 && beaten >= RANKS[k + 1][0]) k++;
    return { name: RANKS[k][1], from: RANKS[k][0], next: RANKS[k + 1] || null };
  }
  function avatarHtml(i, cls) {
    const a = AVATARS[i] || AVATARS[0];
    return '<span class="av ' + (cls || '') + '" style="--ring:' + a[1] + '" aria-hidden="true">' + a[0] + '</span>';
  }

  const KIND_STAT = { rh: 'rocket', rv: 'rocket', pr: 'prop', tnt: 'tnt', lb: 'lb' };
  // Fold one move's events into lifetime stats.
  function recordStats(evs, combo) {
    const st = S.stats;
    if (combo) { st.combos++; if (combo.ball) st.ballCombos++; }
    for (const ev of evs) {
      if (ev.t === 'match') {
        if (ev.combo > st.bestCascade) st.bestCascade = ev.combo;
        for (const c of ev.created) st[KIND_STAT[c.k]]++;
      }
      if (ev.t === 'match' || ev.t === 'blast') {
        for (const h of ev.hits) {
          if (h.k === 'lock') st.lock++;
          else if ((h.k === 'crate' || h.k === 'stone' || h.k === 'moss') && h.hp <= 0) st[h.k]++;
        }
      }
      if (ev.t === 'collect') st.relic++;
    }
  }

  // ---------- helpers ----------

  function areaDef(k) {
    const base = AREAS[k % AREAS.length], cycle = Math.floor(k / AREAS.length);
    return Object.assign({}, base, { number: k + 1, title: base.name + (cycle ? ' ' + (ROMAN[cycle + 1] || cycle + 1) : ''), hue: (cycle * 47) % 360 });
  }
  function goalIcon(g) { return g.type === 'color' ? 'gem' + g.color : g.type; }
  function goalLabel(g) {
    if (g.type === 'color') return Art.GEMS[g.color].name;
    return { crate: 'Crates', moss: 'Moss', lock: 'Chains', stone: 'Stones', relic: 'Crowns' }[g.type];
  }
  // Goal totals as the engine will count them.
  function levelGoals(L) {
    const count = { crate: 0, stone: 0, moss: 0, lock: 0 };
    for (const x of L.grid) {
      if (x.v) continue;
      if (x.b) count[x.b]++;
      if (x.moss) count.moss++;
      if (x.lock) count.lock++;
    }
    return L.goals.map((g) => ({ type: g.type, color: g.color, count: count[g.type] != null ? count[g.type] : g.count }));
  }
  function streakBoosters(n) {
    if (n < 7 || S.streak <= 0) return [];
    return S.streak >= 3 ? ['rocket', 'tnt', 'lb'] : S.streak === 2 ? ['rocket', 'tnt'] : ['rocket'];
  }
  function kindName(k) { return k === 2 ? 'Super hard level' : k === 1 ? 'Hard level' : ''; }
  function haptic(ms) {
    if (!S.haptics || !navigator.vibrate) return;
    // Browsers refuse vibration until the player has tapped the page.
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(ms); } catch (e) { /* not allowed here */ }
  }
  function animateNumber(el, from, to, ms) {
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / ms);
      el.textContent = fmtN(from + (to - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ---------- confetti overlay ----------

  const Confetti = {
    cv: null, ctx: null, parts: [], running: false,
    burst(n, x, y) {
      if (!this.cv) { this.cv = $('#confetti'); this.ctx = this.cv.getContext('2d'); }
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) n = Math.ceil(n / 4);
      const W = this.cv.clientWidth, H = this.cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
      this.cv.width = W * dpr; this.cv.height = H * dpr;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = ['#ffcf3f', '#ff3b55', '#2f86ff', '#2fc95a', '#a955ff', '#fff4dc'];
      for (let k = 0; k < n; k++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, sp = 300 + Math.random() * 520;
        this.parts.push({ x: x != null ? x : W / 2, y: y != null ? y : H * 0.45, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: cols[k % cols.length], life: 1.6 + Math.random() });
      }
      if (!this.running) { this.running = true; let last = performance.now(); const loop = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; this.step(dt); if (this.parts.length) requestAnimationFrame(loop); else { this.running = false; this.ctx.clearRect(0, 0, W, H); } }; requestAnimationFrame(loop); }
    },
    step(dt) {
      const c = this.ctx, W = this.cv.clientWidth, H = this.cv.clientHeight;
      c.clearRect(0, 0, W, H);
      for (const p of this.parts) {
        p.vy += 900 * dt; p.vx *= 0.99; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt;
        c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.globalAlpha = Math.min(1, p.life * 2);
        c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 1.7))); c.restore();
      }
      this.parts = this.parts.filter((p) => p.life > 0 && p.y < H + 40);
    },
  };

  // ---------- modal ----------

  let modalActs = {};
  function showModal(html, acts, cls) {
    const card = $('#card');
    card.className = 'card ' + (cls || '');
    card.innerHTML = html;
    modalActs = acts || {};
    const m = $('#modal');
    m.hidden = false;
    m.classList.remove('open');
    void m.offsetWidth;
    m.classList.add('open');
    const first = card.querySelector('[data-focus]');
    if (first) first.focus({ preventScroll: true });
  }
  function closeModal() {
    $('#modal').hidden = true;
    $('#modal').classList.remove('open');
    modalActs = {};
  }
  $('#card').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    Sfx.click();
    const fn = modalActs[b.dataset.act];
    if (fn) fn(b);
  });

  function rewardTiles(r) {
    const tiles = [];
    if (r.coins) tiles.push(['coin', '+' + fmtN(r.coins)]);
    for (const k of PRE.concat(INGAME)) if (r[k]) tiles.push([INFO[k].icon, '×' + r[k]]);
    if (r.unlimited) tiles.push(['heart', '∞ ' + r.unlimited + 'm']);
    if (r.stars) tiles.push(['star', '+' + r.stars]);
    return tiles.map(([ic, txt], k) => '<div class="rtile" style="animation-delay:' + (k * 120) + 'ms">' + icon(ic, 'ic lg') + '<b>' + txt + '</b></div>').join('');
  }
  function grant(r) {
    S.coins += r.coins || 0;
    S.stats.coinsEarned += r.coins || 0;
    for (const k of Object.keys(S.inv)) S.inv[k] += r[k] || 0;
    if (r.unlimited) S.unlimitedUntil = Math.max(Date.now(), S.unlimitedUntil) + r.unlimited * 60000;
    S.stars += r.stars || 0;
    save();
  }
  function rollChest(big) {
    const r = { coins: big ? 500 + 50 * Math.min(S.area, 10) : 150 + 50 * Math.floor(Math.random() * 5) };
    const pool = PRE.concat(INGAME).filter((k) => S.unlocked[k]);
    const picks = big ? 3 : 2;
    for (let k = 0; k < picks && pool.length; k++) {
      const b = pool[Math.floor(Math.random() * pool.length)];
      r[b] = (r[b] || 0) + 1;
    }
    if (big || Math.random() < 0.3) r.unlimited = big ? 30 : 15;
    return r;
  }
  function openChest(title, sub, reward, done) {
    showModal(
      '<div class="ribbon">' + title + '</div>' +
      '<p class="sub">' + sub + '</p>' +
      '<div class="chestwrap shake" id="chestImg">' + icon('chest', 'chestimg') + '</div>' +
      '<button class="btn gold big" data-act="open" data-focus>Open</button>',
      {
        open: () => {
          Sfx.chest();
          haptic(30);
          $('#chestImg').classList.remove('shake');
          $('#chestImg').innerHTML = icon('chestOpen', 'chestimg pop');
          const r = $('#card').getBoundingClientRect();
          Confetti.burst(90, r.left + r.width / 2, r.top + r.height * 0.4);
          const btn = $('#card [data-act="open"]');
          btn.insertAdjacentHTML('beforebegin', '<div class="rtiles">' + rewardTiles(reward) + '</div>');
          btn.textContent = 'Collect';
          btn.dataset.act = 'collect';
        },
        collect: () => { S.stats.chests++; grant(reward); Sfx.coin(); closeModal(); if (done) done(); },
      },
      'chest'
    );
  }

  // ---------- native apps: ads & purchases ----------
  // window.CCNative exists only inside the iOS/Android apps (src/native.js);
  // on the web every ad or purchase control below simply does not render.

  const native = () => window.CCNative || null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const AD_ICON = '<svg class="adic" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l11-6.5z"/></svg>';
  function rewardButton(act, label) {
    const n = native();
    return n && n.canReward() ? '<button class="btn purple adbtn" data-act="' + act + '">' + AD_ICON + label + '</button>' : '';
  }
  function removeAdsLink() {
    const n = native();
    if (!n || n.state.noAds || !n.state.canBuy || !n.state.adsOn) return '';
    return '<button class="linkbtn" data-act="noads">Go ad-free with Pro' + (n.state.price ? ' · ' + esc(n.state.price) : '') + '</button>';
  }
  // Game sounds stay silent while an ad plays.
  async function withAdAudio(fn) {
    Sfx.setEnabled(false);
    try { return await fn(); } finally { Sfx.setEnabled(S.sound); }
  }
  async function watchRewarded() {
    const n = native();
    if (!n) return false;
    const ok = await withAdAudio(() => n.showRewarded());
    if (!ok) toast('Watch the whole ad to get the reward.');
    return ok;
  }
  // A between-level ad may play as the player leaves a finished level.
  async function leaveLevel(levelN, next) {
    closeModal();
    const n = native();
    if (n) await withAdAudio(() => n.afterLevel(levelN));
    next();
  }
  async function buyNoAds() {
    const n = native();
    if (!n) return;
    const had = n.state.noAds;
    const r = await withAdAudio(() => n.buyNoAds());
    if (r === 'ok' && !had) { Sfx.chest(); Confetti.burst(70); toast('Welcome to Castle Cascade Pro! Between-level ads are off.'); }
    else if (r === 'pending') toast('Purchase pending. Ads switch off as soon as it completes.');
    else if (r === 'owned') toast('You already own Pro. Tap Restore purchases in Settings.');
    else if (r === 'unavailable' || r === 'error') toast('The store is not available right now. Try again later.');
  }
  async function restorePurchases() {
    const n = native();
    if (!n) return;
    const r = await n.restore();
    toast(r === 'ok' ? 'Purchases restored. Pro is active.' : r === 'none' ? 'No purchases found for this store account.' : 'The store is not available right now. Try again later.');
  }
  async function managePro() {
    const n = native();
    if (!n) return;
    const r = await withAdAudio(() => n.manage());
    if (r !== 'ok') toast('The store is not available right now. Try again later.');
  }

  // ---------- home ----------

  let screen = 'home';
  function show(which) {
    screen = which;
    $('#home').hidden = which !== 'home';
    $('#game').hidden = which !== 'game';
    $('#profile').hidden = which !== 'profile';
    view.hidden = which !== 'game';
    if (which === 'game') layoutGame();
    else if (which === 'profile') renderProfile();
    else { renderHome(); checkAchievements(); }
  }

  function renderTop() {
    tickLives();
    $('#livesNum').textContent = unlimited() ? '∞' : S.lives;
    $('#livesTimer').textContent = unlimited() ? fmtTime(S.unlimitedUntil - Date.now()) : S.lives >= MAX_LIVES ? 'Full' : fmtTime(LIFE_MS - (Date.now() - S.lifeTs));
    $('#coinsNum').textContent = fmtN(S.coins);
    $('#starsNum').textContent = fmtN(S.stars);
    $('#avatarSlot').innerHTML = avatarHtml(S.profile.avatar);
    updateAchDot();
  }

  function renderProfile() {
    const beaten = S.level - 1, rank = rankOf(beaten), st = S.stats;
    const pct = rank.next ? (beaten - rank.from) / (rank.next[0] - rank.from) * 100 : 100;
    const winRate = S.plays ? Math.round(S.wins / S.plays * 100) : 0;
    const stats = [
      [fmtN(S.wins), 'Levels won'], [winRate + '%', 'Win rate'], [fmtN(st.bestStreak), 'Best streak'],
      [fmtN(st.firstTry), 'First-try wins'], [fmtN(st.hardWins), 'Hard levels won'], [fmtN(st.superWins), 'Super hard won'],
      [fmtN(st.rocket + st.prop + st.tnt + st.lb), 'Boosters built'], [fmtN(st.combos), 'Booster combos'], [fmtN(st.bestCascade), 'Longest cascade'],
      [fmtN(st.areas), 'Rooms restored'], [fmtN(st.chests), 'Chests opened'], [fmtN(st.coinsEarned), 'Coins earned'],
    ];
    // Claimable first, then in progress, finished last.
    const order = ACH.map((a) => ({ a, s: achState(a) })).sort((x, y) => {
      const w = (o) => (o.s.reached > o.s.claimed ? 0 : o.s.claimed >= o.s.max ? 2 : 1);
      return w(x) - w(y);
    });
    const achHtml = order.map(({ a, s }) => {
      const maxed = s.claimed >= s.max, can = s.reached > s.claimed;
      const target = a.tiers[Math.min(s.claimed, s.max - 1)];
      const prog = maxed ? 100 : Math.min(100, s.value / target * 100);
      const pips = a.tiers.map((_, k) => '<i class="' + (k < s.claimed ? 'got' : k < s.reached ? 'ready' : '') + '"></i>').join('');
      return '<div class="ach' + (can ? ' can' : maxed ? ' max' : '') + '">' + icon(a.icon, 'ic lg') +
        '<div class="achbody"><b>' + a.title + ' <em>' + TIER_NAMES[Math.min(s.claimed, s.max - 1)] + '</em></b>' +
        '<small>' + (maxed ? 'Every tier complete' : a.desc(target)) + '</small>' +
        '<div class="bar"><i style="width:' + prog + '%"></i><span>' + (maxed ? 'Done' : fmtN(Math.min(s.value, target)) + ' / ' + fmtN(target)) + '</span></div>' +
        '<span class="pips" aria-label="' + s.claimed + ' of ' + s.max + ' tiers claimed">' + pips + '</span></div>' +
        (can ? '<button class="claim" data-claim="' + a.id + '">Claim' + '<span>' + icon('coin', 'ic xs') + fmtN(TIER_REWARD[s.claimed]) + '</span></button>' : '') +
        '</div>';
    }).join('');
    const ready = claimable();
    $('#pCoins').textContent = fmtN(S.coins);
    $('#profileBody').innerHTML =
      '<div class="idcard">' + avatarHtml(S.profile.avatar, 'xl') +
      '<div class="idtext">' +
      '<label class="vh" for="nameInput">Your name</label>' +
      '<input id="nameInput" maxlength="16" placeholder="Tap to set your name" autocomplete="off" spellcheck="false">' +
      '<p class="rank">' + rank.name + ' · Level ' + fmtN(S.level) + '</p>' +
      '<div class="bar thin"><i style="width:' + pct + '%"></i></div>' +
      '<p class="ranknext">' + (rank.next ? fmtN(rank.next[0] - beaten) + ' more wins to ' + rank.next[1] : 'Highest rank in the kingdom') + '</p>' +
      '</div></div>' +
      '<h3 class="ph">Avatar</h3>' +
      '<div class="avgrid">' + AVATARS.map((a, i) => {
        const locked = S.level < a[2];
        return '<button class="avpick' + (i === S.profile.avatar ? ' on' : '') + (locked ? ' locked' : '') + '" data-av="' + i + '" aria-label="' + (locked ? 'Unlocks at level ' + a[2] : 'Choose avatar ' + (i + 1)) + '">' +
          avatarHtml(i) + (locked ? '<small>Lv ' + a[2] + '</small>' : '') + '</button>';
      }).join('') + '</div>' +
      '<h3 class="ph">Stats</h3>' +
      '<div class="statgrid">' + stats.map(([v, l]) => '<div class="stat"><b>' + v + '</b><small>' + l + '</small></div>').join('') + '</div>' +
      '<h3 class="ph">Achievements' + (ready ? ' <span class="readyp">' + ready + ' to claim</span>' : '') + '</h3>' +
      '<div class="achlist">' + achHtml + '</div>';
    $('#nameInput').value = S.profile.name;
  }

  function claimAchievement(id, btn) {
    const a = ACH.find((x) => x.id === id);
    if (!a) return;
    const s = achState(a);
    if (s.reached <= s.claimed) return;
    const reward = TIER_REWARD[Math.min(s.claimed, TIER_REWARD.length - 1)];
    S.ach[id] = s.claimed + 1;
    S.coins += reward;
    S.stats.coinsEarned += reward;
    save();
    Sfx.coin();
    haptic(20);
    const r = btn.getBoundingClientRect();
    Confetti.burst(40, r.left + r.width / 2, r.top + r.height / 2);
    toast('+' + fmtN(reward) + ' coins for ' + a.title + ' ' + TIER_NAMES[s.claimed]);
    renderProfile();
    updateAchDot();
  }

  function renderHome(justBuilt) {
    renderTop();
    const n = S.level, kind = LV.levelKind(n);
    $('#playNum').textContent = fmtN(n);
    const pb = $('#playBtn');
    pb.classList.toggle('hard', kind === 1);
    pb.classList.toggle('super', kind === 2);
    $('#playTag').textContent = kindName(kind);
    $('#playTag').hidden = !kind;
    const sb = streakBoosters(n);
    $('#streak').innerHTML = sb.length ? '<span class="flame">' + S.streak + '</span> win streak: ' + sb.map((b) => icon(INFO[b].icon, 'ic sm')).join('') + ' free' : '';
    $('#streak').hidden = !sb.length;
    $('#dailyDot').hidden = S.daily.last === today();
    $('#chestProg').textContent = S.chest + '/' + CHEST_EVERY;
    $('#chestFill').style.width = (S.chest / CHEST_EVERY * 100) + '%';

    const a = areaDef(S.area);
    $('#areaName').textContent = a.title;
    $('#areaSub').textContent = 'Area ' + a.number + ' · ' + S.built + ' of 6 restored';
    $('#areaFill').style.width = (S.built / 6 * 100) + '%';
    const scene = $('#scene');
    scene.style.setProperty('--wall', a.wall);
    scene.style.setProperty('--floor', a.floor);
    scene.style.filter = a.hue ? 'hue-rotate(' + a.hue + 'deg)' : '';
    scene.innerHTML = a.items.map((it, k) => {
      const st = k < S.built ? 'built' : k === S.built ? 'next' : 'todo';
      const [x, y] = SLOTS[k];
      return '<div class="item ' + st + (justBuilt === k ? ' fresh' : '') + '" style="left:' + x + '%;top:' + y + '%">' +
        '<span class="emo" aria-hidden="true">' + it[1] + '</span>' +
        '<span class="tag">' + (k < S.built ? it[0] : '★ ' + COSTS[k]) + '</span></div>';
    }).join('');
    const bb = $('#buildBtn');
    if (S.built < 6) {
      const cost = COSTS[S.built], can = S.stars >= cost;
      bb.innerHTML = 'Build ' + a.items[S.built][0] + ' <span class="cost">' + icon('star', 'ic sm') + cost + '</span>';
      bb.classList.toggle('ready', can);
    }
  }

  function build() {
    const cost = COSTS[S.built];
    if (S.built >= 6) return;
    if (S.stars < cost) {
      toast('Win levels to earn ★. You need ' + cost + ' to build this.');
      $('#playBtn').classList.add('nudge');
      setTimeout(() => $('#playBtn').classList.remove('nudge'), 900);
      return;
    }
    S.stars -= cost;
    const k = S.built;
    S.built++;
    save();
    Sfx.build();
    haptic(25);
    renderHome(k);
    const el = $('#scene .item.fresh');
    if (el) { const r = el.getBoundingClientRect(); Confetti.burst(50, r.left + r.width / 2, r.top + r.height / 2); }
    if (S.built >= 6) {
      const a = areaDef(S.area);
      setTimeout(() => openChest('Area restored!', a.title + ' is fully rebuilt. Here is your royal reward.', rollChest(true), () => {
        S.stats.areas++;
        S.area++;
        S.built = 0;
        save();
        renderHome();
        toast('New area unlocked: ' + areaDef(S.area).title);
      }), 1000);
    }
  }

  function openDaily() {
    const claimed = S.daily.last === today();
    let day = S.daily.day;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (!claimed && S.daily.last && S.daily.last !== y) day = 0;
    const idx = claimed ? (day + 6) % 7 : day % 7;
    const tiles = DAILY.map((r, k) => {
      const st = claimed ? (k <= idx ? 'got' : '') : (k < idx ? 'got' : k === idx ? 'now' : '');
      const main = r.coins ? ['coin', fmtN(r.coins)] : (() => { const b = Object.keys(r).find((x) => INFO[x]); return [INFO[b].icon, '×' + r[b]]; })();
      return '<div class="dtile ' + st + '"><small>Day ' + (k + 1) + '</small>' + icon(main[0], 'ic md') + '<b>' + main[1] + (Object.keys(r).length > 1 ? '+' : '') + '</b></div>';
    }).join('');
    showModal(
      '<div class="ribbon">Daily gift</div>' +
      '<p class="sub">' + (claimed ? 'Come back tomorrow for the next gift.' : 'Log in every day. Day 7 is the big one.') + '</p>' +
      '<div class="dgrid">' + tiles + '</div>' +
      (claimed ? '<button class="btn purple" data-act="close" data-focus>Close</button>' : '<button class="btn gold big" data-act="claim" data-focus>Claim day ' + (idx + 1) + '</button>'),
      {
        close: closeModal,
        claim: () => {
          const r = DAILY[idx];
          S.stats.dailies++;
          grant(r);
          S.daily = { last: today(), day: (idx + 1) % 7 };
          save();
          Sfx.chest();
          Confetti.burst(70);
          closeModal();
          renderHome();
          toast('Daily gift collected');
        },
      }
    );
  }

  function openChestInfo() {
    showModal(
      '<div class="ribbon">Level chest</div>' +
      '<div class="chestwrap">' + icon('chest', 'chestimg') + '</div>' +
      '<p class="sub">Win ' + (CHEST_EVERY - S.chest) + ' more level' + (CHEST_EVERY - S.chest === 1 ? '' : 's') + ' to open it. Every chest has coins and boosters.</p>' +
      '<div class="bar big"><i style="width:' + (S.chest / CHEST_EVERY * 100) + '%"></i><span>' + S.chest + ' / ' + CHEST_EVERY + '</span></div>' +
      '<button class="btn purple" data-act="close" data-focus>Got it</button>',
      { close: closeModal }
    );
  }

  // Settings rows for the app stores; empty on the web.
  function shopRows() {
    const n = native();
    if (!n) return '';
    const st = n.state;
    const until = st.proUntil ? new Date(st.proUntil).toLocaleDateString() : '';
    const pro = st.noAds
      ? '<div class="row static"><span>Pro' + (until ? ' until ' + esc(until) : ' · lifetime') + '</span><b aria-hidden="true">✓</b></div>' +
        '<button class="row" data-act="manage"><span>Manage Pro</span><b aria-hidden="true">›</b></button>'
      : st.canBuy ? '<button class="row" data-act="noads"><span>Go ad-free with Pro</span><b class="price">' + esc(st.price) + '</b></button>' : '';
    return '<div class="rows">' + pro +
      '<button class="row" data-act="restore"><span>Restore purchases</span><b aria-hidden="true">›</b></button>' +
      (st.privacyChoices ? '<button class="row" data-act="adprivacy"><span>Ad privacy choices</span><b aria-hidden="true">›</b></button>' : '') +
      '</div>';
  }

  function openSettings(inGame) {
    const acts = {
      sound: () => { S.sound = !S.sound; Sfx.setEnabled(S.sound); save(); openSettings(inGame); },
      haptics: () => { S.haptics = !S.haptics; save(); openSettings(inGame); },
      privacy: () => openLegal('privacy'),
      terms: () => openLegal('terms'),
      credits: () => openLegal('credits'),
      noads: () => buyNoAds().then(() => openSettings(inGame)),
      restore: () => restorePurchases().then(() => openSettings(inGame)),
      manage: () => managePro().then(() => openSettings(inGame)),
      adprivacy: () => { const n = native(); if (n) n.privacyChoices(); },
      close: closeModal,
      reset: (b) => {
        if (b.dataset.armed) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } S = fresh(); save(); closeModal(); renderHome(); toast('Progress reset'); return; }
        b.dataset.armed = '1';
        b.textContent = 'Tap again to erase everything';
      },
      quit: (b) => {
        if (!b.dataset.armed) { b.dataset.armed = '1'; b.textContent = 'Quit and lose a life?'; return; }
        loseLife();
        S.streak = 0;
        save();
        closeModal();
        game = null;
        show('home');
      },
    };
    showModal(
      '<div class="ribbon">' + (inGame ? 'Paused' : 'Settings') + '</div>' +
      '<div class="rows">' +
      '<button class="row" data-act="sound"><span>Sound</span><b class="sw ' + (S.sound ? 'on' : '') + '">' + (S.sound ? 'On' : 'Off') + '</b></button>' +
      '<button class="row" data-act="haptics"><span>Vibration</span><b class="sw ' + (S.haptics ? 'on' : '') + '">' + (S.haptics ? 'On' : 'Off') + '</b></button>' +
      '</div>' +
      '<div class="rows legalrows">' +
      '<button class="row" data-act="privacy"><span>Privacy Policy</span><b aria-hidden="true">›</b></button>' +
      '<button class="row" data-act="terms"><span>Terms of Service</span><b aria-hidden="true">›</b></button>' +
      '<button class="row" data-act="credits"><span>Credits & Licences</span><b aria-hidden="true">›</b></button>' +
      '</div>' +
      shopRows() +
      (inGame ? '<button class="btn green big" data-act="close" data-focus>Resume</button><button class="btn ghost" data-act="quit">Quit level</button>'
        : '<button class="btn purple" data-act="close" data-focus>Done</button><button class="btn ghost danger" data-act="reset">Reset progress and delete my data</button>') +
      '<p class="fine">Level ' + fmtN(S.level) + (S.level <= LV.LEVEL_COUNT ? ' of ' + fmtN(LV.LEVEL_COUNT) : ' · endless levels') + ' · ' + fmtN(S.wins) + ' wins</p>',
      acts
    );
  }

  function openNoLives() {
    const render = () => {
      const el = $('#lifeWait');
      if (!el) { clearInterval(timer); return; }
      tickLives();
      if (S.lives > 0) { clearInterval(timer); closeModal(); renderHome(); return; }
      el.textContent = fmtTime(LIFE_MS - (Date.now() - S.lifeTs));
    };
    const timer = setInterval(render, 1000);
    showModal(
      '<div class="ribbon red">Out of lives</div>' +
      '<div class="chestwrap">' + icon('heart', 'chestimg dim') + '</div>' +
      '<p class="sub">Next life in <b id="lifeWait">' + fmtTime(LIFE_MS - (Date.now() - S.lifeTs)) + '</b></p>' +
      '<button class="btn gold big" data-act="refill" data-focus>Refill 5 lives <span class="cost">' + icon('coin', 'ic sm') + REFILL_PRICE + '</span></button>' +
      rewardButton('adLife', 'Watch an ad: +1 life') +
      '<button class="btn ghost" data-act="close">Wait</button>',
      {
        close: () => { clearInterval(timer); closeModal(); },
        adLife: async () => {
          if (!(await watchRewarded())) return;
          tickLives();
          S.lives = Math.min(MAX_LIVES, S.lives + 1);
          save();
          clearInterval(timer);
          closeModal();
          renderHome();
          Sfx.coin();
          toast('+1 life');
        },
        refill: () => {
          if (S.coins < REFILL_PRICE) { toast('Not enough coins yet. Lives refill on their own every 30 minutes.'); return; }
          S.coins -= REFILL_PRICE;
          S.lives = MAX_LIVES;
          S.lifeTs = Date.now();
          save();
          clearInterval(timer);
          closeModal();
          renderHome();
          Sfx.coin();
        },
      }
    );
  }

  // ---------- level start ----------

  let preSel = {};
  function openLevelStart() {
    tickLives();
    if (!unlimited() && S.lives <= 0) { openNoLives(); return; }
    const n = S.level;
    for (const [lv, b] of UNLOCKS) {
      if (n >= lv && !S.unlocked[b]) {
        S.unlocked[b] = 1;
        S.inv[b] += 3;
        save();
        showModal(
          '<div class="ribbon">New booster!</div>' +
          '<div class="chestwrap">' + icon(INFO[b].icon, 'chestimg pop') + '</div>' +
          '<h3>' + INFO[b].name + '</h3><p class="sub">' + INFO[b].desc + '</p>' +
          '<div class="rtiles">' + rewardTiles({ [b]: 3 }) + '</div>' +
          '<button class="btn green big" data-act="ok" data-focus>Awesome</button>',
          { ok: () => openLevelStart(), back: () => openLevelStart() }
        );
        Sfx.special();
        return;
      }
    }
    const L = LV.getLevel(n), goals = levelGoals(L);
    const kind = L.kind;
    const free = streakBoosters(n);
    const preHtml = PRE.filter((b) => S.unlocked[b]).map((b) => {
      const owned = S.inv[b], on = preSel[b] && owned > 0;
      return '<button class="pre ' + (on ? 'on' : '') + '" data-act="pre" data-b="' + b + '" aria-pressed="' + (on ? 'true' : 'false') + '">' +
        icon(INFO[b].icon, 'ic md') + (owned > 0 ? '<span class="badge">' + owned + '</span>' : '<span class="badge buy">+</span>') +
        '<small>' + (owned > 0 ? INFO[b].name : icon('coin', 'ic xs') + PRICE[b]) + '</small></button>';
    }).join('');
    showModal(
      '<div class="ribbon ' + (kind === 2 ? 'purple' : kind === 1 ? 'red' : '') + '">Level ' + fmtN(n) + '</div>' +
      (kind ? '<div class="kindtag k' + kind + '">' + kindName(kind) + '</div>' : '') +
      '<p class="sub">Collect these in <b>' + L.moves + ' moves</b></p>' +
      '<div class="goalrow">' + goals.map((g) => '<div class="g">' + icon(goalIcon(g), 'ic lg') + '<b>' + g.count + '</b><small>' + goalLabel(g) + '</small></div>').join('') + '</div>' +
      (L.tip ? '<p class="tip">' + L.tip + '</p>' : '') +
      (preHtml ? '<p class="label">Boosters for this level</p><div class="prerow">' + preHtml + '</div>' : '') +
      (free.length ? '<p class="streakline"><span class="flame">' + S.streak + '</span> Win streak bonus: ' + free.map((b) => icon(INFO[b].icon, 'ic sm')).join('') + '</p>' : '') +
      '<button class="btn green big" data-act="play" data-focus>Play</button>',
      {
        pre: (btn) => {
          const b = btn.dataset.b;
          if (S.inv[b] <= 0) {
            if (S.coins < PRICE[b]) { toast('Not enough coins for ' + INFO[b].name); return; }
            S.coins -= PRICE[b];
            S.inv[b]++;
            preSel[b] = true;
            save();
            Sfx.coin();
          } else {
            preSel[b] = !preSel[b];
          }
          openLevelStart();
        },
        back: closeModal,
        play: () => {
          const chosen = PRE.filter((b) => preSel[b] && S.inv[b] > 0);
          for (const b of chosen) S.inv[b]--;
          S.stats.boosters += chosen.length;
          preSel = {};
          save();
          closeModal();
          startLevel(n, chosen.concat(free));
        },
      },
      'start'
    );
  }

  // ---------- gameplay ----------

  let game = null, level = null, busy = false, extraBuys = 0, activeBooster = null, shownGoals = [], hintTimer = 0, adMovesUsed = false;
  const view = new window.CCBoard($('#board'), {
    canInput: () => !busy && game && game.status === 'play',
    onSwap: (a, b) => {
      const pa = game.cells[a].p, pb = game.cells[b].p;
      const combo = E.isSpecial(pa) && E.isSpecial(pb) ? { ball: pa.k === 'lb' || pb.k === 'lb' } : null;
      runMove(() => game.swap(a, b), combo);
    },
    onTap: (i) => runMove(() => game.tap(i)),
    onCell: (i) => useBoosterAt(i),
    boosterActive: () => !!activeBooster,
    onActivity: () => armHint(),
    haptic,
    goalPos: (gi) => {
      const el = document.querySelector('.goal[data-gi="' + gi + '"] img');
      if (!el) return null;
      const r = el.getBoundingClientRect(), c = $('#board').getBoundingClientRect();
      return { x: r.left + r.width / 2 - c.left, y: r.top + r.height / 2 - c.top };
    },
    onGoalArrive: (gi) => {
      if (!game || shownGoals[gi] == null) return;
      shownGoals[gi] = Math.max(game.goals[gi].left, shownGoals[gi] - 1);
      renderGoal(gi, true);
    },
    onCombo: (n) => { if (n >= 5) haptic(30); },
    onBonusTick: (left) => { $('#movesNum').textContent = left; },
  });

  function renderGoals() {
    $('#goals').innerHTML = game.goals.map((g, gi) =>
      '<div class="goal" data-gi="' + gi + '">' + icon(goalIcon(g)) + '<b class="cnt"></b></div>').join('');
    game.goals.forEach((g, gi) => renderGoal(gi));
  }
  function renderGoal(gi, bump) {
    const el = document.querySelector('.goal[data-gi="' + gi + '"]');
    if (!el) return;
    const left = shownGoals[gi];
    const cnt = el.querySelector('.cnt');
    el.classList.toggle('done', left <= 0);
    cnt.textContent = left <= 0 ? '✓' : left;
    if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }
  function syncGoals() {
    if (!game) return;
    game.goals.forEach((g, gi) => { if (shownGoals[gi] !== g.left) { shownGoals[gi] = g.left; renderGoal(gi); } });
  }
  function renderMoves() {
    const m = game.moves;
    $('#movesNum').textContent = m;
    $('#movesBox').classList.toggle('low', m <= 5);
  }
  function renderBoosters() {
    $('#boosterBar').innerHTML = INGAME.map((k) => {
      const unlockedAt = UNLOCKS.find((u) => u[1] === k)[0];
      if (!S.unlocked[k]) return '<button class="bst locked" data-k="' + k + '" aria-label="' + INFO[k].name + ' (locked)">' + icon(INFO[k].icon) + '<small>Lv ' + unlockedAt + '</small></button>';
      const n = S.inv[k];
      return '<button class="bst ' + (activeBooster === k ? 'on' : '') + '" data-k="' + k + '" aria-label="' + INFO[k].name + '">' + icon(INFO[k].icon) +
        (n > 0 ? '<span class="badge">' + n + '</span>' : '<span class="badge buy">+</span>') + '</button>';
    }).join('');
    $('#boosterHint').hidden = !activeBooster;
    if (activeBooster) $('#boosterHint').textContent = 'Tap a tile to use the ' + INFO[activeBooster].name + ' · tap the booster again to cancel';
  }

  function layoutGame() {
    const c = $('#board').getBoundingClientRect();
    const hud = $('#game .hud').getBoundingClientRect();
    const bar = $('#boosterBar').getBoundingClientRect();
    const top = hud.bottom - c.top + 4, bottom = bar.top - c.top - 4;
    view.resize({ x: 0, y: top, w: c.width, h: Math.max(120, bottom - top) });
  }

  function startLevel(n, boosters) {
    level = LV.getLevel(n);
    game = new E.Game(level, { boosters });
    extraBuys = 0;
    adMovesUsed = false;
    activeBooster = null;
    busy = true;
    S.plays++;
    if (S.attempt.level !== n) S.attempt = { level: n, n: 0 };
    S.attempt.n++;
    save();
    shownGoals = game.goals.map((g) => g.left);
    $('#levelBadge').textContent = 'Level ' + fmtN(n);
    show('game');
    renderGoals();
    renderMoves();
    renderBoosters();
    view.setGame(game);
    layoutGame();
    banner('<small>Level ' + fmtN(n) + '</small>' + (level.kind ? '<em class="k' + level.kind + '">' + kindName(level.kind) + '</em>' : '') +
      '<span class="bgoals">' + game.goals.map((g) => icon(goalIcon(g), 'ic md') + '<b>' + g.total + '</b>').join('') + '</span>', 1500).then(() => {
      busy = false;
      if (level.tip) showTip(level.tip);
      armHint();
    });
  }

  function showTip(text) {
    const t = $('#tipCard');
    t.textContent = text;
    t.hidden = false;
  }

  let bannerTimer = 0;
  function banner(html, ms) {
    const b = $('#banner');
    b.innerHTML = html;
    b.hidden = false;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
    clearTimeout(bannerTimer);
    return new Promise((res) => { bannerTimer = setTimeout(() => { b.hidden = true; res(); }, ms); });
  }

  function armHint() {
    clearTimeout(hintTimer);
    view.showHint(null);
    if (!game || game.status !== 'play') return;
    hintTimer = setTimeout(() => {
      if (busy || !game || game.status !== 'play' || screen !== 'game') return;
      view.showHint(bestHint());
    }, S.level <= 3 ? 3000 : 6500);
  }
  function bestHint() {
    const moves = game.findMoves();
    let best = null, bestS = -1;
    for (const m of moves) {
      if (m.tap != null) { if (bestS < 5) { best = m; bestS = 5; } continue; }
      const h = game.clone(12345);
      const before = h.cleared;
      if (!h.swap(m.a, m.b)) continue;
      const s = h.cleared - before;
      if (s > bestS) { bestS = s; best = m; }
    }
    return best;
  }

  async function runMove(fn, combo) {
    if (busy || !game || game.status !== 'play') return;
    busy = true;
    clearTimeout(hintTimer);
    view.showHint(null);
    const ok = fn();
    const evs = game.takeEvents();
    if (ok) {
      renderMoves();
      $('#tipCard').hidden = true;
      recordStats(evs, combo);
      save();
    }
    await view.play(evs);
    syncGoals();
    renderMoves();
    busy = false;
    if (game.status === 'won') return onWin();
    if (game.status === 'lost') return onOutOfMoves();
    armHint();
  }

  function selectBooster(k) {
    if (busy || !game || game.status !== 'play') return;
    if (!S.unlocked[k]) { toast(INFO[k].name + ' unlocks at level ' + UNLOCKS.find((u) => u[1] === k)[0]); return; }
    if (S.inv[k] <= 0) {
      showModal(
        '<div class="ribbon">' + INFO[k].name + '</div>' +
        '<div class="chestwrap">' + icon(INFO[k].icon, 'chestimg') + '</div>' +
        '<p class="sub">' + INFO[k].desc + '</p>' +
        '<button class="btn gold big" data-act="buy" data-focus>Buy 1 <span class="cost">' + icon('coin', 'ic sm') + PRICE[k] + '</span></button>' +
        '<button class="btn ghost" data-act="close">Not now</button>',
        {
          close: closeModal,
          buy: () => {
            if (S.coins < PRICE[k]) { toast('Not enough coins. Win levels and open chests to earn more.'); return; }
            S.coins -= PRICE[k];
            S.inv[k]++;
            save();
            Sfx.coin();
            closeModal();
            renderBoosters();
          },
        }
      );
      return;
    }
    if (k === 'shuffle') {
      runMove(() => {
        const ok = game.useBooster('shuffle');
        if (ok) { S.inv.shuffle--; S.stats.boosters++; save(); renderBoosters(); }
        return ok;
      });
      return;
    }
    activeBooster = activeBooster === k ? null : k;
    renderBoosters();
  }

  function useBoosterAt(i) {
    const k = activeBooster;
    activeBooster = null;
    renderBoosters();
    if (!k) return;
    runMove(() => {
      const ok = game.useBooster(k, i);
      if (ok) { S.inv[k]--; S.stats.boosters++; save(); renderBoosters(); }
      return ok;
    });
  }

  async function onWin() {
    busy = true;
    clearTimeout(hintTimer);
    const n = level.n, kind = level.kind;
    Sfx.win();
    haptic(60);
    Confetti.burst(120);
    await banner('<span class="big">Level complete!</span>', 1300);
    const left = game.moves;
    if (left > 0) {
      banner('<span class="big">Grand Finale!</span><small>Every move left becomes a comet. Tap to speed up.</small>', 1400);
      view.speed = 1.6;
      game.bonus();
      await view.play(game.takeEvents());
      view.speed = 1;
    }
    const base = LEVEL_COINS[kind], bonusCoins = left * BONUS_COIN_PER_MOVE, coins = base + bonusCoins;
    const coinsBefore = S.coins;
    S.coins += coins;
    S.stars += 1;
    S.level = n + 1;
    S.streak += 1;
    S.chest += 1;
    S.wins += 1;
    const st = S.stats;
    st.bestStreak = Math.max(st.bestStreak, S.streak);
    if (kind >= 1) st.hardWins++;
    if (kind === 2) st.superWins++;
    if (S.attempt.level === n && S.attempt.n === 1) st.firstTry++;
    st.coinsEarned += coins;
    const chestFull = S.chest >= CHEST_EVERY;
    save();
    showWin({ n, kind, base, bonusCoins, coins, coinsBefore, chestFull });
    checkAchievements();
    if (native()) native().track(S.level);
  }

  function showWin(w) {
    const nextKind = LV.levelKind(w.n + 1);
    const free = streakBoosters(w.n + 1);
    const canBuild = S.built < 6 && S.stars >= COSTS[S.built];
    const chestPct = Math.min(1, S.chest / CHEST_EVERY) * 100;
    showModal(
      '<div class="ribbon gold">Level ' + fmtN(w.n) + ' complete!</div>' +
      '<div class="winstar">' + icon('star', 'chestimg pop') + '</div>' +
      '<div class="rewards">' +
      '<div class="rw">' + icon('star', 'ic lg') + '<b>+1</b><small>Star</small></div>' +
      '<div class="rw">' + icon('coin', 'ic lg') + '<b id="winCoins">+0</b><small>' + (w.bonusCoins ? fmtN(w.base) + ' + ' + fmtN(w.bonusCoins) + ' bonus' : 'Coins') + '</small></div>' +
      '</div>' +
      '<div class="chestline">' + icon('chest', 'ic md') + '<div class="bar"><i id="winChest" style="width:' + ((S.chest - 1) / CHEST_EVERY * 100) + '%"></i><span>' + Math.min(S.chest, CHEST_EVERY) + ' / ' + CHEST_EVERY + '</span></div></div>' +
      (free.length ? '<p class="streakline"><span class="flame">' + S.streak + '</span> Streak bonus next level: ' + free.map((b) => icon(INFO[b].icon, 'ic sm')).join('') + '</p>' : '') +
      '<p class="next">Next: Level ' + fmtN(w.n + 1) + (nextKind ? ' · <b class="k' + nextKind + '">' + kindName(nextKind) + '</b>' : '') + '</p>' +
      (w.chestFull ? '<button class="btn gold big pulse" data-act="chest" data-focus>Open level chest</button>'
        : '<button class="btn green big pulse" data-act="next" data-focus>Next level ▸</button>') +
      '<button class="btn ' + (canBuild ? 'gold' : 'ghost') + '" data-act="home">' + (canBuild ? 'Build in your kingdom ★' : 'Kingdom') + '</button>' +
      rewardButton('adDouble', 'Watch an ad: double coins (+' + fmtN(w.coins) + ')') +
      removeAdsLink(),
      {
        next: () => leaveLevel(w.n, () => { game = null; show('home'); openLevelStart(); }),
        home: () => leaveLevel(w.n, () => { game = null; show('home'); }),
        back: () => leaveLevel(w.n, () => { game = null; show('home'); }),
        chest: () => {
          S.chest = 0;
          save();
          openChest('Level chest!', 'Ten wins in the bag. Open it up!', rollChest(false), () => leaveLevel(w.n, () => { game = null; show('home'); openLevelStart(); }));
        },
        adDouble: async (btn) => {
          if (!(await watchRewarded())) return;
          S.coins += w.coins;
          S.stats.coinsEarned += w.coins;
          save();
          Sfx.coin();
          const el = $('#winCoins');
          if (el) animateNumber(el, w.coins, w.coins * 2, 700);
          btn.remove();
          toast('Coins doubled: +' + fmtN(w.coins));
        },
        noads: buyNoAds,
      },
      'win'
    );
    animateNumber($('#winCoins'), 0, w.coins, 900);
    setTimeout(() => { const el = $('#winChest'); if (el) el.style.width = chestPct + '%'; }, 250);
    Sfx.coin();
  }

  function remainingHtml() {
    return '<div class="goalrow">' + game.goals.filter((g) => g.left > 0).map((g) => '<div class="g">' + icon(goalIcon(g), 'ic lg') + '<b>' + g.left + '</b><small>' + goalLabel(g) + '</small></div>').join('') + '</div>';
  }

  async function keepPlaying() {
    closeModal();
    game.addMoves(5);
    renderMoves();
    await view.play(game.takeEvents());
    busy = false;
    armHint();
  }

  function onOutOfMoves() {
    busy = true;
    const price = EXTRA_MOVES_PRICE[Math.min(extraBuys, EXTRA_MOVES_PRICE.length - 1)];
    const total = game.goals.reduce((s, g) => s + g.left, 0);
    showModal(
      '<div class="ribbon red">Out of moves!</div>' +
      '<p class="sub">' + (total <= 5 ? 'So close! Only ' + total + ' left:' : 'You still need:') + '</p>' + remainingHtml() +
      '<button class="btn gold big pulse" data-act="more" data-focus>+5 moves <span class="cost">' + icon('coin', 'ic sm') + fmtN(price) + '</span></button>' +
      (adMovesUsed ? '' : rewardButton('adMoves', 'Watch an ad: +5 moves')) +
      '<button class="btn ghost" data-act="quit">Give up</button>' +
      '<p class="fine">Giving up costs a life' + (S.streak > 0 ? ' and ends your ' + S.streak + '-win streak' : '') + '.</p>',
      {
        more: async () => {
          if (S.coins < price) { toast('Not enough coins. You have ' + fmtN(S.coins) + '.'); return; }
          S.coins -= price;
          extraBuys++;
          save();
          Sfx.coin();
          await keepPlaying();
        },
        adMoves: async () => {
          if (!(await watchRewarded())) return;
          adMovesUsed = true;
          await keepPlaying();
        },
        quit: () => {
          loseLife();
          S.streak = 0;
          save();
          Sfx.lose();
          showFail();
        },
        // The back button must not quietly cost a life here.
        back: () => {},
      }
    );
  }

  function showFail() {
    tickLives();
    const lives = unlimited() ? '∞' : S.lives;
    const n = level.n;
    showModal(
      '<div class="ribbon red">Level failed</div>' +
      '<div class="chestwrap">' + icon('heart', 'chestimg dim') + '</div>' +
      '<p class="sub">You lost a life. Lives left: <b>' + lives + '</b></p>' +
      '<button class="btn green big" data-act="retry" data-focus>Try again</button>' +
      '<button class="btn ghost" data-act="home">Kingdom</button>',
      {
        retry: () => leaveLevel(n, () => { game = null; show('home'); openLevelStart(); }),
        home: () => leaveLevel(n, () => { game = null; show('home'); }),
        back: () => leaveLevel(n, () => { game = null; show('home'); }),
      }
    );
  }

  // ---------- wiring ----------

  $('#playBtn').addEventListener('click', () => { Sfx.unlock(); Sfx.click(); openLevelStart(); });
  $('#buildBtn').addEventListener('click', () => { Sfx.unlock(); build(); });
  $('#dailyBtn').addEventListener('click', () => { Sfx.unlock(); Sfx.click(); openDaily(); });
  $('#chestBtn').addEventListener('click', () => { Sfx.click(); openChestInfo(); });
  $('#avatarBtn').addEventListener('click', () => { Sfx.unlock(); Sfx.click(); show('profile'); });
  $('#profileBack').addEventListener('click', () => { Sfx.click(); show('home'); });
  $('#profileSettings').addEventListener('click', () => { Sfx.click(); openSettings(false); });
  $('#profileBody').addEventListener('click', (e) => {
    const claim = e.target.closest('[data-claim]');
    if (claim) { claimAchievement(claim.dataset.claim, claim); return; }
    const pick = e.target.closest('[data-av]');
    if (!pick) return;
    const i = +pick.dataset.av, need = AVATARS[i][2];
    if (S.level < need) { toast('Reach level ' + need + ' to unlock this avatar'); return; }
    Sfx.click();
    S.profile.avatar = i;
    save();
    renderProfile();
  });
  $('#profileBody').addEventListener('change', (e) => {
    if (e.target.id !== 'nameInput') return;
    S.profile.name = e.target.value.trim().slice(0, 16);
    e.target.value = S.profile.name;
    save();
    toast(S.profile.name ? 'Name saved' : 'Name cleared');
  });
  $('#profileBody').addEventListener('keydown', (e) => { if (e.target.id === 'nameInput' && e.key === 'Enter') e.target.blur(); });
  $('#livesPill').addEventListener('click', () => { tickLives(); if (S.lives < MAX_LIVES && !unlimited()) openNoLives(); else toast('Lives are full'); });
  $('#pauseBtn').addEventListener('click', () => { if (!busy) openSettings(true); });
  $('#boosterBar').addEventListener('click', (e) => {
    const b = e.target.closest('.bst');
    if (!b) return;
    Sfx.click();
    selectBooster(b.dataset.k);
  });
  $('#game').addEventListener('pointerdown', () => { if (view.speed > 1 && view.speed < 4) view.speed = 4; });
  window.addEventListener('resize', () => { if (screen === 'game') layoutGame(); });
  setInterval(() => { if (screen === 'home') renderTop(); }, 1000);

  // Android back button: close the top layer; on the home screen the app minimises.
  function handleBack() {
    if (!$('#legalView').hidden) { closeLegal(); return true; }
    if (!$('#modal').hidden) {
      const fn = modalActs.back || modalActs.close;
      if (fn) fn();
      return true;
    }
    if (screen === 'profile') { show('home'); return true; }
    if (screen === 'game') { if (!busy) openSettings(true); return true; }
    return false;
  }
  if (native()) {
    native().onBack(handleBack);
    native().onPause(() => Sfx.setEnabled(false));
    native().onResume(() => Sfx.setEnabled(S.sound));
  }

  // Debug jump for playtesting: open the page with #lv250 to play level 250.
  const jump = /^#lv(\d+)$/.exec(location.hash);
  if (jump) { S.level = Math.max(1, +jump[1]); for (const [lv, b] of UNLOCKS) if (S.level > lv && !S.unlocked[b]) { S.unlocked[b] = 1; S.inv[b] += 3; } }

  // ---------- legal documents ----------

  let legalReturn = null;
  function openLegal(kind) {
    const doc = window.CCLegal.DOCS[kind];
    if (!doc) return;
    const el = $('#legalView');
    if (el.hidden) legalReturn = document.activeElement;
    $('#legalTitle').textContent = doc.title;
    $('#legalBody').innerHTML = doc.html();
    $('#legalBody').scrollTop = 0;
    el.querySelectorAll('.ltabs [data-legal]').forEach((b) => b.setAttribute('aria-current', b.dataset.legal === kind ? 'page' : 'false'));
    el.hidden = false;
    $('#legalBack').focus({ preventScroll: true });
  }
  function closeLegal() {
    $('#legalView').hidden = true;
    if (legalReturn && legalReturn.focus) legalReturn.focus({ preventScroll: true });
  }
  $('#legalBack').addEventListener('click', () => { Sfx.click(); closeLegal(); });
  $('#legalView').addEventListener('click', (e) => {
    const b = e.target.closest('.ltabs [data-legal]');
    if (b) { Sfx.click(); openLegal(b.dataset.legal); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#legalView').hidden) closeLegal(); });
  // Links on the launch screen open a document without starting the game.
  $('#intro .legalnote').addEventListener('click', (e) => {
    const b = e.target.closest('[data-legal]');
    if (!b) return;
    e.stopPropagation();
    openLegal(b.dataset.legal);
  });

  // ---------- launch intro ----------

  function runIntro() {
    const el = $('#intro');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = 0;
    el.querySelectorAll('.title .word').forEach((w) => {
      w.innerHTML = Array.from(w.textContent).map((ch) => '<span class="l" style="--i:' + (n++) + '">' + ch + '</span>').join('');
    });

    // Gems rain behind the castle; the final tap bursts a handful outward.
    const cv = $('#introFx'), ctx = cv.getContext('2d'), parts = [];
    const KINDS = ['g', 'g', 'g', 'g', 'g', 'g', 'rh', 'tnt', 'pr', 'lb'];
    let W = 0, H = 0, running = true, last = performance.now(), acc = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const spawn = (x, y, vx, vy, size) => {
      const k = KINDS[(Math.random() * KINDS.length) | 0];
      parts.push({ x, y, vx, vy, size, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 3, life: 0, p: { k, c: (Math.random() * 6) | 0 } });
    };
    const loop = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) {
        acc += dt;
        while (acc > 0.11) { acc -= 0.11; spawn(Math.random() * W, -40, (Math.random() - 0.5) * 30, 60 + Math.random() * 110, 24 + Math.random() * 24); }
      }
      ctx.clearRect(0, 0, W, H);
      for (const q of parts) {
        q.vy += 150 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; q.life += dt;
        ctx.save();
        ctx.translate(q.x, q.y);
        ctx.rotate(q.rot);
        ctx.globalAlpha = Math.min(1, q.life * 3) * 0.9;
        ctx.drawImage(Art.piece(q.p, 96), -q.size / 2, -q.size / 2, q.size, q.size);
        ctx.restore();
      }
      for (let k = parts.length - 1; k >= 0; k--) {
        const q = parts[k];
        if (q.y > H + 60 || q.x < -80 || q.x > W + 80) parts.splice(k, 1);
      }
      requestAnimationFrame(loop);
    };
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(loop);

    let ready = false, leaving = false;
    const makeReady = () => {
      if (ready) return;
      ready = true;
      el.classList.add('ready');
      $('#introPlay').hidden = false;
      $('#introPlay').focus({ preventScroll: true });
    };
    Promise.all([
      new Promise((r) => setTimeout(r, reduced ? 300 : 2000)),
      document.fonts ? document.fonts.ready.catch(() => null) : null,
    ]).then(makeReady);

    el.addEventListener('click', () => {
      if (leaving) return;
      leaving = true;
      makeReady();
      Sfx.unlock();
      Sfx.intro();
      haptic(30);
      if (!reduced) {
        for (let k = 0; k < 40; k++) {
          const a = Math.random() * Math.PI * 2, sp = 280 + Math.random() * 520;
          spawn(W / 2, H * 0.4, Math.cos(a) * sp, Math.sin(a) * sp - 220, 30 + Math.random() * 26);
        }
      }
      el.classList.add('leaving');
      setTimeout(() => {
        running = false;
        el.hidden = true;
        window.removeEventListener('resize', resize);
        const home = $('#home');
        home.classList.add('enter');
        setTimeout(() => home.classList.remove('enter'), 1400);
        // Consent form and ad loading wait until the player is past the intro.
        if (native()) native().start();
      }, reduced ? 50 : 620);
    });
  }

  Sfx.setEnabled(S.sound);
  renderHome();
  show('home');
  runIntro();
  Cloud.init();
  window.CCApp = { get state() { return S; }, get game() { return game; }, view, startLevel, openLevelStart };
})();
