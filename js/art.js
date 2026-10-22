/* Castle Cascade — procedural art. Every piece, blocker and icon is drawn
 * once per size into an offscreen canvas and reused. Coordinates inside a
 * draw function run from -1 to 1 around the centre. */
(function (root) {
  'use strict';

  const GEMS = [
    { base: '#ff3b55', light: '#ffa3b0', dark: '#9c0f2b', name: 'Ruby' },
    { base: '#2f86ff', light: '#a8d0ff', dark: '#173d9c', name: 'Sapphire' },
    { base: '#2fc95a', light: '#a6f5b7', dark: '#0f7230', name: 'Emerald' },
    { base: '#ffc41f', light: '#fff3a3', dark: '#b06d00', name: 'Topaz' },
    { base: '#a955ff', light: '#dfb7ff', dark: '#54169e', name: 'Amethyst' },
    { base: '#ff8124', light: '#ffc999', dark: '#a03f00', name: 'Amber' },
  ];

  const cache = new Map();

  function sprite(key, size, draw) {
    const k = key + '@' + size;
    let c = cache.get(k);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.max(4, Math.round(size));
    const ctx = c.getContext('2d');
    ctx.translate(c.width / 2, c.height / 2);
    const s = c.width / 2;
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    draw(ctx);
    cache.set(k, c);
    return c;
  }

  function vgrad(ctx, y0, y1, stops) {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  }

  // ---------- gem silhouettes ----------

  const SHAPES = [
    (ctx) => { // heart
      ctx.moveTo(0, 0.82);
      ctx.bezierCurveTo(-1.05, 0.05, -0.92, -0.92, 0, -0.42);
      ctx.bezierCurveTo(0.92, -0.92, 1.05, 0.05, 0, 0.82);
    },
    (ctx) => { // teardrop
      ctx.moveTo(0, -0.92);
      ctx.bezierCurveTo(0.45, -0.42, 0.78, -0.02, 0.78, 0.3);
      ctx.arc(0, 0.3, 0.78, 0, Math.PI);
      ctx.bezierCurveTo(-0.78, -0.02, -0.45, -0.42, 0, -0.92);
    },
    (ctx) => { // emerald cut
      const a = 0.58, b = 0.84;
      ctx.moveTo(-a, -b); ctx.lineTo(a, -b); ctx.lineTo(b, -a); ctx.lineTo(b, a);
      ctx.lineTo(a, b); ctx.lineTo(-a, b); ctx.lineTo(-b, a); ctx.lineTo(-b, -a);
    },
    (ctx) => { // star
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 0.46 : 0.96, ang = -Math.PI / 2 + k * Math.PI / 5;
        const x = Math.cos(ang) * r, y = Math.sin(ang) * r + 0.06;
        if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
    },
    (ctx) => { // brilliant-cut diamond
      ctx.moveTo(-0.52, -0.72); ctx.lineTo(0.52, -0.72); ctx.lineTo(0.94, -0.18);
      ctx.lineTo(0, 0.94); ctx.lineTo(-0.94, -0.18);
    },
    (ctx) => { // orb
      ctx.arc(0, 0, 0.86, 0, Math.PI * 2);
    },
  ];

  function drawGem(ctx, c) {
    const g = GEMS[c], shape = SHAPES[c];
    ctx.save();
    ctx.translate(0, 0.07);
    ctx.beginPath(); shape(ctx); ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,20,0.32)';
    ctx.fill();
    ctx.restore();

    ctx.beginPath(); shape(ctx); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -0.9, 0.9, [g.light, g.base, g.dark]);
    ctx.fill();
    ctx.lineWidth = 0.09;
    ctx.strokeStyle = g.dark;
    ctx.stroke();

    // inner facet
    ctx.save();
    ctx.translate(0, -0.06);
    ctx.scale(0.56, 0.56);
    ctx.beginPath(); shape(ctx); ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.lineWidth = 0.1;
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.stroke();
    ctx.restore();

    if (c === 4) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 0.05;
      ctx.beginPath();
      ctx.moveTo(-0.94, -0.18); ctx.lineTo(0.94, -0.18);
      ctx.moveTo(-0.3, -0.18); ctx.lineTo(0, 0.94); ctx.lineTo(0.3, -0.18);
      ctx.stroke();
    }
    if (c === 5) {
      ctx.beginPath(); ctx.arc(0, 0, 0.55, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.08; ctx.stroke();
    }

    // highlight
    ctx.save();
    ctx.translate(-0.3, -0.42);
    ctx.rotate(-0.55);
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.26, 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0.32, 0.28, 0.06, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
  }

  // ---------- specials ----------

  // Comet: a bright core with twin tails along the line it clears.
  function drawComet(ctx, vertical) {
    ctx.save();
    if (vertical) ctx.rotate(Math.PI / 2);
    const glow = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 0.95);
    glow.addColorStop(0, 'rgba(150,225,255,0.5)');
    glow.addColorStop(1, 'rgba(150,225,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-1, -1, 2, 2);
    // Streaks fanning out both ways show which line the comet will clear.
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      for (const [y, w, reach, col] of [[0, 0.32, 0.98, '120,235,255'], [-0.27, 0.17, 0.82, '190,150,255'], [0.27, 0.17, 0.82, '190,150,255']]) {
        const g = ctx.createLinearGradient(0, y, side * reach, y);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(' + col + ',1)');
        g.addColorStop(1, 'rgba(' + col + ',0)');
        ctx.strokeStyle = 'rgba(16,14,60,0.45)';
        ctx.lineWidth = w + 0.1;
        ctx.beginPath(); ctx.moveTo(side * 0.2, y); ctx.lineTo(side * reach, y); ctx.stroke();
        ctx.strokeStyle = g;
        ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(side * 0.2, y); ctx.lineTo(side * reach, y); ctx.stroke();
      }
    }
    cometCore(ctx, 0, 0, 0.4);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-0.12, -0.3); ctx.lineTo(-0.08, -0.16); ctx.lineTo(0.06, -0.12); ctx.lineTo(-0.08, -0.08);
    ctx.lineTo(-0.12, 0.06); ctx.lineTo(-0.16, -0.08); ctx.lineTo(-0.3, -0.12); ctx.lineTo(-0.16, -0.16);
    ctx.closePath();
    ctx.fill();
    for (const [x, y, r] of [[0.62, -0.4, 0.06], [-0.66, 0.38, 0.05], [0.36, 0.5, 0.045], [-0.4, -0.5, 0.045]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function cometCore(ctx, x, y, r) {
    const core = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.05, x, y, r);
    core.addColorStop(0, '#ffffff');
    core.addColorStop(0.4, '#fff2b0');
    core.addColorStop(1, '#ff9a1f');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 0.09; ctx.strokeStyle = '#7a3a00'; ctx.stroke();
    ctx.lineWidth = 0.045; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke();
  }

  // Single-tailed comet used while one streaks across the board (points right).
  function drawCometHead(ctx) {
    const g = ctx.createLinearGradient(0.45, 0, -0.98, 0);
    g.addColorStop(0, 'rgba(140,225,255,0.95)');
    g.addColorStop(1, 'rgba(120,120,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0.45, -0.36);
    ctx.quadraticCurveTo(-0.3, -0.26, -0.98, 0);
    ctx.quadraticCurveTo(-0.3, 0.26, 0.45, 0.36);
    ctx.closePath();
    ctx.fill();
    cometCore(ctx, 0.45, 0, 0.32);
  }

  function drawKeg(ctx) {
    ctx.fillStyle = 'rgba(0,0,20,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0.84, 0.66, 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -0.68); ctx.quadraticCurveTo(0.08, -0.96, 0.38, -0.9);
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 0.09; ctx.stroke();
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-0.55, -0.68);
      ctx.quadraticCurveTo(-0.92, 0.05, -0.55, 0.8);
      ctx.lineTo(0.55, 0.8);
      ctx.quadraticCurveTo(0.92, 0.05, 0.55, -0.68);
      ctx.closePath();
    };
    body();
    const wood = ctx.createLinearGradient(-0.8, 0, 0.8, 0);
    ['#6e3a12', '#c98443', '#e8a95e', '#a8642a', '#552b0c'].forEach((c, k) => wood.addColorStop(k / 4, c));
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.save();
    body();
    ctx.clip();
    ctx.strokeStyle = 'rgba(61,31,8,0.45)';
    ctx.lineWidth = 0.04;
    for (const x of [-0.42, -0.14, 0.14, 0.42]) {
      ctx.beginPath(); ctx.moveTo(x * 0.85, -0.7); ctx.quadraticCurveTo(x * 1.25, 0.05, x * 0.85, 0.82); ctx.stroke();
    }
    ctx.fillStyle = vgrad(ctx, -1, 1, ['#9aa4b5', '#3d4452']);
    ctx.fillRect(-1, -0.5, 2, 0.13);
    ctx.fillRect(-1, 0.52, 2, 0.13);
    ctx.fillStyle = '#d42a2a';
    ctx.fillRect(-1, -0.15, 2, 0.36);
    ctx.restore();
    body();
    ctx.strokeStyle = '#3d1f08'; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -0.12);
    ctx.quadraticCurveTo(0.2, 0.02, 0.1, 0.17);
    ctx.quadraticCurveTo(0, 0.24, -0.1, 0.17);
    ctx.quadraticCurveTo(-0.2, 0.02, 0, -0.12);
    ctx.fillStyle = '#ffd23a'; ctx.fill();
    ctx.lineWidth = 0.035; ctx.strokeStyle = '#7a3a00'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, -0.68, 0.55, 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#b06d32'; ctx.fill();
    ctx.lineWidth = 0.06; ctx.strokeStyle = '#3d1f08'; ctx.stroke();
    ctx.save();
    ctx.translate(0.38, -0.9);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 ? 0.07 : 0.2, a = k * Math.PI / 4;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#fff36b'; ctx.fill();
    ctx.restore();
  }

  // Dragonfly, head up; it is rotated to face where it flies.
  function drawDragonfly(ctx) {
    ctx.fillStyle = 'rgba(0,0,20,0.25)';
    ctx.beginPath(); ctx.ellipse(0, 0.86, 0.5, 0.1, 0, 0, Math.PI * 2); ctx.fill();
    const wing = (x, y, rx, ry, a) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(205,245,255,0.62)'; ctx.fill();
      ctx.lineWidth = 0.04; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-rx * 0.85, 0); ctx.lineTo(rx * 0.85, 0);
      ctx.lineWidth = 0.025; ctx.strokeStyle = 'rgba(110,180,215,0.7)'; ctx.stroke();
      ctx.restore();
    };
    for (const s of [-1, 1]) {
      wing(s * 0.48, -0.34, 0.47, 0.15, s * -0.22);
      wing(s * 0.45, -0.06, 0.43, 0.13, s * 0.2);
    }
    const teal = vgrad(ctx, -0.7, 0.95, ['#8ff7e8', '#1fc4b0', '#0a6f6a']);
    ctx.lineWidth = 0.05;
    ctx.strokeStyle = '#064a46';
    ctx.beginPath();
    ctx.moveTo(-0.11, -0.12);
    ctx.quadraticCurveTo(-0.09, 0.6, 0, 0.95);
    ctx.quadraticCurveTo(0.09, 0.6, 0.11, -0.12);
    ctx.closePath();
    ctx.fillStyle = teal; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,207,63,0.85)';
    ctx.lineWidth = 0.035;
    for (const y of [0.16, 0.36, 0.56, 0.74]) {
      const half = 0.1 * (1 - y * 0.8);
      ctx.beginPath(); ctx.moveTo(-half, y); ctx.lineTo(half, y); ctx.stroke();
    }
    ctx.strokeStyle = '#064a46';
    ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.ellipse(0, -0.24, 0.15, 0.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = teal; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.52, 0.16, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.arc(s * 0.1, -0.56, 0.085, 0, Math.PI * 2);
      ctx.fillStyle = '#1d2a3a'; ctx.fill();
      ctx.beginPath(); ctx.arc(s * 0.1 - 0.025, -0.585, 0.028, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
  }

  // Prism: a rainbow hexagon crystal.
  function drawPrism(ctx) {
    const glow = ctx.createRadialGradient(0, 0, 0.3, 0, 0, 1);
    glow.addColorStop(0, 'rgba(255,255,255,0.5)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-1, -1, 2, 2);
    const R = 0.86, pts = [];
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 3; pts.push([Math.cos(a) * R, Math.sin(a) * R]); }
    const cols = ['#ff3b55', '#ff9a2b', '#ffe03a', '#3fd96a', '#3d8bff', '#b05cff'];
    for (let k = 0; k < 6; k++) {
      const p = pts[k], q = pts[(k + 1) % 6];
      const g = ctx.createLinearGradient(0, 0, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(1, cols[k]);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x * 0.42, y * 0.42) : ctx.moveTo(x * 0.42, y * 0.42)));
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
    ctx.beginPath();
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.03;
    ctx.beginPath();
    for (const [x, y] of pts) { ctx.moveTo(0, 0); ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-0.38, -0.62); ctx.lineTo(-0.33, -0.48); ctx.lineTo(-0.19, -0.43); ctx.lineTo(-0.33, -0.38);
    ctx.lineTo(-0.38, -0.24); ctx.lineTo(-0.43, -0.38); ctx.lineTo(-0.57, -0.43); ctx.lineTo(-0.43, -0.48);
    ctx.closePath();
    ctx.fill();
  }

  function drawRelic(ctx) {
    ctx.fillStyle = 'rgba(0,0,20,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0.72, 0.76, 0.15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.78, 0.6); ctx.lineTo(-0.86, -0.38); ctx.lineTo(-0.42, 0.02);
    ctx.lineTo(0, -0.62); ctx.lineTo(0.42, 0.02); ctx.lineTo(0.86, -0.38); ctx.lineTo(0.78, 0.6);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -0.62, 0.6, ['#fff6b0', '#ffd23a', '#c98a00']);
    ctx.fill();
    ctx.strokeStyle = '#6e4500'; ctx.lineWidth = 0.08; ctx.stroke();
    ctx.fillStyle = '#b87800';
    ctx.fillRect(-0.78, 0.36, 1.56, 0.12);
    for (const [x, y] of [[-0.86, -0.42], [0, -0.68], [0.86, -0.42]]) {
      ctx.beginPath(); ctx.arc(x, y, 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#fff3a0'; ctx.fill(); ctx.stroke();
    }
    [['#ff3b55', -0.42], ['#2f86ff', 0], ['#2fc95a', 0.42]].forEach(([col, x]) => {
      ctx.beginPath(); ctx.arc(x, 0.2, 0.11, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 0.04; ctx.strokeStyle = '#6e4500'; ctx.stroke();
    });
  }

  // ---------- blockers & overlays ----------

  function drawCrate(ctx, hp) {
    const woods = [null, ['#e7a964', '#c47c3a', '#8a4f1e'], ['#d38f4c', '#a8642a', '#6e3a12'], ['#b8743a', '#8a4d1f', '#552b0c']];
    const w = woods[Math.max(1, Math.min(3, hp))];
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.92, -0.92, 1.84, 1.84, 0.14) : ctx.rect(-0.92, -0.92, 1.84, 1.84);
    ctx.fillStyle = vgrad(ctx, -0.92, 0.92, w);
    ctx.fill();
    ctx.strokeStyle = '#3d1f08'; ctx.lineWidth = 0.1; ctx.stroke();
    ctx.strokeStyle = 'rgba(61,31,8,0.55)'; ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(-0.92, -0.32); ctx.lineTo(0.92, -0.32);
    ctx.moveTo(-0.92, 0.32); ctx.lineTo(0.92, 0.32);
    ctx.stroke();
    ctx.lineWidth = 0.12; ctx.strokeStyle = 'rgba(61,31,8,0.75)';
    ctx.beginPath(); ctx.moveTo(-0.7, 0.72); ctx.lineTo(0.7, -0.72); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.lineWidth = 0.05;
    ctx.beginPath(); ctx.moveTo(-0.8, -0.8); ctx.lineTo(0.8, -0.8); ctx.stroke();
    if (hp >= 2) {
      ctx.fillStyle = '#9aa5b5'; ctx.strokeStyle = '#3a4250'; ctx.lineWidth = 0.05;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        ctx.beginPath();
        ctx.moveTo(sx * 0.92, sy * 0.92); ctx.lineTo(sx * 0.48, sy * 0.92); ctx.lineTo(sx * 0.92, sy * 0.48);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    if (hp >= 3) {
      ctx.fillStyle = vgrad(ctx, -0.92, 0.92, ['#8b95a6', '#4c5566']);
      ctx.fillRect(-0.5, -0.92, 0.2, 1.84);
      ctx.fillRect(0.3, -0.92, 0.2, 1.84);
      ctx.fillStyle = '#d7dde8';
      for (const x of [-0.4, 0.4]) for (const y of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.arc(x, y, 0.05, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function drawStone(ctx) {
    ctx.beginPath();
    const pts = [[-0.82, -0.4], [-0.45, -0.88], [0.25, -0.9], [0.86, -0.5], [0.92, 0.3], [0.5, 0.88], [-0.35, 0.9], [-0.9, 0.42]];
    pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -0.9, 0.9, ['#c7ced8', '#8a94a3', '#555e6c']);
    ctx.fill();
    ctx.strokeStyle = '#2d333c'; ctx.lineWidth = 0.09; ctx.stroke();
    ctx.strokeStyle = 'rgba(40,46,56,0.7)'; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.moveTo(-0.3, -0.6); ctx.lineTo(-0.05, -0.1); ctx.lineTo(-0.35, 0.3);
    ctx.moveTo(0.4, 0.1); ctx.lineTo(0.15, 0.55); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(-0.25, -0.55, 0.3, 0.1, -0.4, 0, Math.PI * 2); ctx.fill();
  }

  function drawMoss(ctx, hp) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.96, -0.96, 1.92, 1.92, 0.22) : ctx.rect(-0.96, -0.96, 1.92, 1.92);
    ctx.fillStyle = hp >= 2 ? vgrad(ctx, -1, 1, ['#2c5e33', '#1a3d22']) : vgrad(ctx, -1, 1, ['#4a8a45', '#2f6332']);
    ctx.fill();
    ctx.strokeStyle = hp >= 2 ? 'rgba(150,220,130,0.45)' : 'rgba(190,240,160,0.5)';
    ctx.lineWidth = 0.07;
    const blades = [[-0.7, 0.7], [-0.35, 0.8], [0.0, 0.65], [0.4, 0.78], [0.72, 0.6], [-0.6, -0.3], [0.55, -0.45], [-0.1, -0.7]];
    ctx.beginPath();
    for (const [x, y] of blades) { ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 0.05, y - 0.15, x + 0.12, y - 0.24); }
    ctx.stroke();
    if (hp >= 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      for (const [x, y] of [[-0.55, 0.1], [0.6, 0.2], [0.05, -0.2]]) { ctx.beginPath(); ctx.arc(x, y, 0.07, 0, Math.PI * 2); ctx.fill(); }
    }
  }

  function drawLock(ctx) {
    const link = (x, y, a) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, 0, 0.17, 0.1, 0, 0, Math.PI * 2);
      ctx.lineWidth = 0.075; ctx.strokeStyle = '#2e3440'; ctx.stroke();
      ctx.lineWidth = 0.045; ctx.strokeStyle = '#c9d2df'; ctx.stroke();
      ctx.restore();
    };
    for (let k = -3; k <= 3; k++) {
      const t = k * 0.27;
      link(t, t, Math.PI / 4);
      link(t, -t, -Math.PI / 4);
    }
    // padlock
    ctx.beginPath(); ctx.arc(0, -0.1, 0.17, Math.PI, 0);
    ctx.lineWidth = 0.08; ctx.strokeStyle = '#555'; ctx.stroke();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.25, -0.1, 0.5, 0.38, 0.07) : ctx.rect(-0.25, -0.1, 0.5, 0.38);
    ctx.fillStyle = vgrad(ctx, -0.1, 0.28, ['#ffe27a', '#d19a00']);
    ctx.fill(); ctx.lineWidth = 0.05; ctx.strokeStyle = '#6b4a00'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.06, 0.05, 0, Math.PI * 2); ctx.fillStyle = '#6b4a00'; ctx.fill();
  }

  // ---------- UI icons ----------

  function drawCoin(ctx) {
    ctx.beginPath(); ctx.arc(0, 0.05, 0.86, 0, Math.PI * 2); ctx.fillStyle = '#9a6400'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, -0.03, 0.86, 0, Math.PI * 2);
    ctx.fillStyle = vgrad(ctx, -0.9, 0.8, ['#fff3a0', '#ffcc2a', '#e09800']);
    ctx.fill(); ctx.lineWidth = 0.07; ctx.strokeStyle = '#8a5800'; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -0.03, 0.62, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(138,88,0,0.6)'; ctx.lineWidth = 0.06; ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.34, 0.22); ctx.lineTo(-0.38, -0.22); ctx.lineTo(-0.17, -0.02); ctx.lineTo(0, -0.32);
    ctx.lineTo(0.17, -0.02); ctx.lineTo(0.38, -0.22); ctx.lineTo(0.34, 0.22); ctx.closePath();
    ctx.fillStyle = '#c68400'; ctx.fill();
  }

  function drawHeart(ctx) {
    ctx.beginPath(); SHAPES[0](ctx); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -0.9, 0.9, ['#ff8fa0', '#ff2d4b', '#a3001f']);
    ctx.fill(); ctx.lineWidth = 0.08; ctx.strokeStyle = '#6e0016'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-0.38, -0.36, 0.18, 0.1, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fill();
  }

  function drawStar(ctx) {
    ctx.beginPath(); SHAPES[3](ctx); ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -0.9, 0.9, ['#fff7b8', '#ffd21f', '#d98a00']);
    ctx.fill(); ctx.lineWidth = 0.08; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-0.18, -0.28, 0.16, 0.08, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill();
  }

  function drawMallet(ctx) {
    ctx.save(); ctx.rotate(-0.6);
    ctx.fillStyle = vgrad(ctx, -0.1, 0.1, ['#e2a866', '#9a5a26']);
    ctx.fillRect(-0.08, -0.26, 0.16, 1.2);
    ctx.strokeStyle = '#4a2a0e'; ctx.lineWidth = 0.05; ctx.strokeRect(-0.08, -0.26, 0.16, 1.2);
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.68, -0.8, 1.36, 0.58, 0.12) : ctx.rect(-0.68, -0.8, 1.36, 0.58);
    ctx.fillStyle = vgrad(ctx, -0.8, -0.22, ['#f0be7a', '#c07a3c', '#7a4316']);
    ctx.fill(); ctx.lineWidth = 0.07; ctx.strokeStyle = '#3d1f08'; ctx.stroke();
    for (const x of [-0.68, 0.68]) {
      ctx.beginPath(); ctx.ellipse(x, -0.51, 0.12, 0.29, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e0a868'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, -0.51, 0.05, 0.14, 0, 0, Math.PI * 2);
      ctx.lineWidth = 0.03; ctx.strokeStyle = 'rgba(61,31,8,0.6)'; ctx.stroke();
      ctx.lineWidth = 0.07; ctx.strokeStyle = '#3d1f08';
    }
    ctx.fillStyle = vgrad(ctx, -0.8, -0.22, ['#c9d1de', '#5d6878']);
    ctx.fillRect(-0.5, -0.8, 0.1, 0.58);
    ctx.fillRect(0.4, -0.8, 0.1, 0.58);
    ctx.restore();
  }

  // Jousting lance, pointing right.
  function drawLance(ctx) {
    ctx.save(); ctx.rotate(-0.12);
    const shaft = () => { ctx.beginPath(); ctx.moveTo(-0.55, -0.2); ctx.lineTo(0.98, 0); ctx.lineTo(-0.55, 0.2); ctx.closePath(); };
    shaft();
    ctx.fillStyle = '#fff4e0'; ctx.fill();
    ctx.save();
    shaft();
    ctx.clip();
    ctx.fillStyle = '#e8364d';
    for (let x = -0.6; x < 1; x += 0.28) {
      ctx.beginPath(); ctx.moveTo(x, -0.3); ctx.lineTo(x + 0.13, -0.3); ctx.lineTo(x + 0.25, 0.3); ctx.lineTo(x + 0.12, 0.3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    shaft();
    ctx.lineWidth = 0.05; ctx.strokeStyle = '#5a1a20'; ctx.stroke();
    ctx.fillStyle = '#7a4a1a';
    ctx.fillRect(-0.95, -0.08, 0.42, 0.16);
    ctx.beginPath(); ctx.ellipse(-0.55, 0, 0.11, 0.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = vgrad(ctx, -0.4, 0.4, ['#fff08a', '#ffcf3f', '#b97c00']); ctx.fill();
    ctx.lineWidth = 0.05; ctx.strokeStyle = '#6b4a00'; ctx.stroke();
    ctx.restore();
  }

  function drawAnvil(ctx) {
    ctx.fillStyle = 'rgba(0,0,20,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0.78, 0.7, 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-0.96, -0.42);
    ctx.quadraticCurveTo(-0.62, -0.5, -0.42, -0.58);
    ctx.lineTo(0.8, -0.58); ctx.lineTo(0.8, -0.26); ctx.lineTo(0.38, -0.2);
    ctx.quadraticCurveTo(0.22, 0.08, 0.28, 0.34);
    ctx.lineTo(0.6, 0.42); ctx.lineTo(0.6, 0.7); ctx.lineTo(-0.6, 0.7); ctx.lineTo(-0.6, 0.42); ctx.lineTo(-0.28, 0.34);
    ctx.quadraticCurveTo(-0.22, 0.08, -0.38, -0.2);
    ctx.lineTo(-0.46, -0.26);
    ctx.quadraticCurveTo(-0.7, -0.3, -0.96, -0.42);
    ctx.closePath();
    ctx.fillStyle = vgrad(ctx, -0.6, 0.7, ['#b9c3d2', '#5d6878', '#2b3240']);
    ctx.fill();
    ctx.lineWidth = 0.07; ctx.strokeStyle = '#14181f'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-0.4, -0.51); ctx.lineTo(0.74, -0.51);
    ctx.lineWidth = 0.05; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.stroke();
  }

  function drawShuffle(ctx) {
    ctx.lineWidth = 0.17;
    for (const [col, a0] of [['#b05cff', 0], ['#2fc5b5', Math.PI]]) {
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.arc(0, 0, 0.62, a0 + 0.35, a0 + Math.PI - 0.15); ctx.stroke();
      const a = a0 + Math.PI - 0.15, x = Math.cos(a) * 0.62, y = Math.sin(a) * 0.62;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2);
      ctx.beginPath(); ctx.moveTo(0.2, 0); ctx.lineTo(-0.14, -0.2); ctx.lineTo(-0.14, 0.2); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd21f'; ctx.fill();
    ctx.lineWidth = 0.05; ctx.strokeStyle = '#7a4a00'; ctx.stroke();
  }

  function drawChest(ctx, open) {
    ctx.fillStyle = 'rgba(0,0,20,0.3)';
    ctx.beginPath(); ctx.ellipse(0, 0.82, 0.85, 0.13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.85, -0.05, 1.7, 0.85, 0.1) : ctx.rect(-0.85, -0.05, 1.7, 0.85);
    ctx.fillStyle = vgrad(ctx, -0.05, 0.8, ['#c8803c', '#7d4518']); ctx.fill();
    ctx.lineWidth = 0.07; ctx.strokeStyle = '#3a1d06'; ctx.stroke();
    if (open) {
      const g = ctx.createRadialGradient(0, -0.2, 0.05, 0, -0.2, 0.9);
      g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(1, 'rgba(255,200,40,0)');
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 1.2);
      ctx.beginPath(); ctx.moveTo(-0.85, -0.05); ctx.lineTo(-0.7, -0.75); ctx.lineTo(0.7, -0.75); ctx.lineTo(0.85, -0.05); ctx.closePath();
      ctx.fillStyle = '#5a2e0c'; ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(-0.85, -0.05); ctx.lineTo(-0.85, -0.35); ctx.quadraticCurveTo(0, -0.95, 0.85, -0.35); ctx.lineTo(0.85, -0.05); ctx.closePath();
      ctx.fillStyle = vgrad(ctx, -0.8, -0.05, ['#e09a52', '#9a5520']); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = vgrad(ctx, -0.8, 0.8, ['#ffe57a', '#d39a00']);
    ctx.fillRect(-0.55, -0.62, 0.16, 1.42);
    ctx.fillRect(0.39, -0.62, 0.16, 1.42);
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.17, -0.18, 0.34, 0.36, 0.06) : ctx.rect(-0.17, -0.18, 0.34, 0.36);
    ctx.fill(); ctx.lineWidth = 0.05; ctx.strokeStyle = '#6b4a00'; ctx.stroke();
  }

  const DRAW = {
    rh: (ctx) => drawComet(ctx, false),
    rv: (ctx) => drawComet(ctx, true),
    tnt: drawKeg,
    pr: drawDragonfly,
    lb: drawPrism,
    cometHead: drawCometHead,
    relic: drawRelic,
    stone: drawStone,
    lock: drawLock,
    coin: drawCoin,
    heart: drawHeart,
    star: drawStar,
    hammer: drawMallet,
    arrow: drawLance,
    cannon: drawAnvil,
    shuffle: drawShuffle,
    chest: (ctx) => drawChest(ctx, false),
    chestOpen: (ctx) => drawChest(ctx, true),
    rocket: (ctx) => { ctx.rotate(-0.5); drawComet(ctx, false); },
  };

  // Piece sprite for an engine piece {k, c}.
  function piece(p, size) {
    if (p.k === 'g') return sprite('g' + p.c, size, (ctx) => drawGem(ctx, p.c));
    return sprite(p.k, size, DRAW[p.k]);
  }
  function crate(hp, size) { return sprite('crate' + hp, size, (ctx) => drawCrate(ctx, hp)); }
  function moss(hp, size) { return sprite('moss' + hp, size, (ctx) => drawMoss(ctx, hp)); }
  function icon(name, size) {
    if (name.startsWith('gem')) { const c = +name.slice(3); return sprite('g' + c, size, (ctx) => drawGem(ctx, c)); }
    if (name === 'crate') return crate(1, size);
    if (name === 'moss') return moss(1, size);
    return sprite(name, size, DRAW[name]);
  }
  const urls = new Map();
  function iconURL(name, size) {
    const k = name + '@' + (size || 96);
    if (!urls.has(k)) urls.set(k, icon(name, size || 96).toDataURL());
    return urls.get(k);
  }

  root.CCArt = { GEMS, piece, crate, moss, icon, iconURL, lock: (size) => sprite('lock', size, drawLock), stone: (size) => sprite('stone', size, drawStone) };
})(window);
