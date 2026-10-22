// Renders the app icon and splash screen (the game's golden crown on the
// royal night sky) into assets/, where `npx capacitor-assets generate`
// picks them up to make every Android and iOS size. `npm run icons` runs both.
const path = require('path');
const sharp = require('sharp');
const out = path.join(__dirname, '..', 'assets');

const DEFS = '<defs>' +
  '<linearGradient id="gold" x1="0" y1="-0.62" x2="0" y2="0.6" gradientUnits="userSpaceOnUse">' +
  '<stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#ffd23a"/><stop offset="1" stop-color="#c98a00"/></linearGradient>' +
  '<radialGradient id="sky" cx=".5" cy=".4" r=".75"><stop offset="0" stop-color="#5a4fd6"/><stop offset=".55" stop-color="#2d3391"/><stop offset="1" stop-color="#12153f"/></radialGradient>' +
  '<radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffe680" stop-opacity=".55"/><stop offset="1" stop-color="#ffe680" stop-opacity="0"/></radialGradient>' +
  '</defs>';

// Same shapes as drawRelic in js/art.js, in -1..1 units.
const CROWN =
  '<ellipse cx="0" cy="0.74" rx="0.76" ry="0.15" fill="#000014" fill-opacity=".35"/>' +
  '<polygon points="-0.78,0.6 -0.86,-0.38 -0.42,0.02 0,-0.62 0.42,0.02 0.86,-0.38 0.78,0.6" fill="url(#gold)" stroke="#6e4500" stroke-width="0.08" stroke-linejoin="round"/>' +
  '<rect x="-0.78" y="0.36" width="1.56" height="0.12" fill="#b87800"/>' +
  [[-0.86, -0.42], [0, -0.68], [0.86, -0.42]].map(([x, y]) => '<circle cx="' + x + '" cy="' + y + '" r="0.12" fill="#fff3a0" stroke="#6e4500" stroke-width="0.08"/>').join('') +
  [['#ff3b55', -0.42], ['#2f86ff', 0], ['#2fc95a', 0.42]].map(([c, x]) => '<circle cx="' + x + '" cy="0.2" r="0.11" fill="' + c + '" stroke="#6e4500" stroke-width="0.04"/>').join('') +
  '<ellipse cx="-0.42" cy="-0.12" rx="0.16" ry="0.06" transform="rotate(-25 -0.42 -0.12)" fill="#ffffff" fill-opacity=".7"/>';

const RAYS = Array.from({ length: 16 }, (_, k) => {
  const a = (k / 16) * Math.PI * 2, b = a + Math.PI / 32;
  return '<polygon points="0,0 ' + (Math.cos(a) * 3).toFixed(3) + ',' + (Math.sin(a) * 3).toFixed(3) + ' ' + (Math.cos(b) * 3).toFixed(3) + ',' + (Math.sin(b) * 3).toFixed(3) + '" fill="#ffe680" fill-opacity=".13"/>';
}).join('');

// `half` sets how much of the canvas the crown fills (smaller = bigger crown).
const svg = ({ size, half, background, rays }) =>
  '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="' + (-half) + ' ' + (-half) + ' ' + half * 2 + ' ' + half * 2 + '">' +
  DEFS + (background ? '<rect x="' + (-half) + '" y="' + (-half) + '" width="' + half * 2 + '" height="' + half * 2 + '" fill="url(#sky)"/>' : '') +
  (rays ? RAYS + '<circle cx="0" cy="0" r="1.1" fill="url(#glow)"/>' : '') +
  '<g transform="translate(0 0.05)">' + CROWN + '</g></svg>';

const jobs = [
  ['icon-only.png', svg({ size: 1024, half: 1.45, background: true, rays: true })],
  // Adaptive icon: the foreground keeps the crown inside the centre safe zone.
  ['icon-foreground.png', svg({ size: 1024, half: 1.9, background: false, rays: false })],
  ['icon-background.png', svg({ size: 1024, half: 1.45, background: true, rays: true }).replace(/<g transform[\s\S]*<\/g>/, '')],
  ['splash.png', svg({ size: 2732, half: 5, background: true, rays: true })],
  ['splash-dark.png', svg({ size: 2732, half: 5, background: true, rays: true })],
];

Promise.all(jobs.map(([name, s]) => sharp(Buffer.from(s)).png().toFile(path.join(out, name)).then(() => console.log('assets/' + name))))
  .catch((e) => { console.error(e); process.exit(1); });
