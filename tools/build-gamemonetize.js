// Builds the GameMonetize.com version of the game into dist-gamemonetize/
// and zips it as builds/castle-cascade-gamemonetize.zip (tools/zip-portal.py).
//
//   dist-gamemonetize/
//     index.html                                   GameMonetize SDK snippet + the game's markup
//     css/castle-cascade-<hash>-gamemonetize.css    game.css with the fonts bundled
//     js/castle-cascade-<hash>-gamemonetize.js      every game script + portals/gamemonetize/portal.js
//     fonts/<font>-<hash>-gamemonetize.woff2
//
// Every file name carries a content hash and a portal suffix: GameMonetize's
// CDN caches files for years, so a re-upload must never reuse a name.
// The website and app builds (tools/build.js) are not touched.
//
// Usage: node tools/build-gamemonetize.js [--no-zip]
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const GAME_ID = 'ht3rcfs8psdug4s22wqt21g4n43xel0c';   // GameMonetize → Edit Game
const SUFFIX = 'gamemonetize';

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist-gamemonetize');
const zipFile = path.join(root, 'builds', 'castle-cascade-gamemonetize.zip');
const read = (rel) => fs.readFileSync(path.join(root, rel));
const hash = (data) => crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
const named = (base, data, ext) => base + '-' + hash(data) + '-' + SUFFIX + ext;

fs.rmSync(out, { recursive: true, force: true });
const write = (rel, data) => {
  fs.mkdirSync(path.dirname(path.join(out, rel)), { recursive: true });
  fs.writeFileSync(path.join(out, rel), data);
  console.log('dist-gamemonetize/' + rel, (data.length / 1024).toFixed(1) + ' KB');
  return rel;
};

// Fonts, bundled so nothing loads from Google Fonts.
const fonts = {};
for (const f of ['LilitaOne-latin', 'Nunito-latin']) {
  const data = read('assets/fonts/' + f + '.woff2');
  fonts[f] = write('fonts/' + named(f, data, '.woff2'), data);
}

// CSS: the fonts, the game's stylesheet, and a few landscape tweaks for the portal's 16:9 frame.
const css =
  '@font-face{font-family:"Lilita One";src:url(../' + fonts['LilitaOne-latin'] + ') format("woff2");font-weight:400;font-display:swap}\n' +
  '@font-face{font-family:"Nunito";src:url(../' + fonts['Nunito-latin'] + ') format("woff2");font-weight:200 1000;font-display:swap}\n' +
  read('css/game.css').toString() +
  '\n/* GameMonetize: in a wide landscape frame the level tip sits beside the board, not on it. */\n' +
  '@media (min-width: 960px) and (min-aspect-ratio: 4/3) {\n' +
  '  .tipcard, .boosterhint { left: auto; right: calc(100% + 24px); top: 42%; bottom: auto; margin: 0; width: min(260px, calc((100vw - 520px) / 2 - 40px)); }\n' +
  '}\n';
const cssFile = write('css/' + named('castle-cascade', css, '.css'), css);

// Scripts, in the order index.html loads them, plus the portal glue before app.js.
const page = read('index.html').toString();
const parts = [];
page.replace(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g, (_, src, inline) => {
  if (src === 'js/legal.js') parts.push("window.CC_LEGAL = { portal: 'GameMonetize', purchases: false, cloudSave: false };");
  if (src === 'js/app.js') parts.push(read('portals/gamemonetize/portal.js').toString());
  parts.push(src ? read(src).toString() : inline);
  return '';
});
const js = parts.map((p) => p.trim()).join('\n;\n') + '\n';
const jsFile = write('js/' + named('castle-cascade', js, '.js'), js);

// The page: the game's markup without its own head tags and scripts.
const body = page
  .replace(/<script(?: src="[^"]+")?>[\s\S]*?<\/script>\s*/g, '')
  .replace(/<(title)>[\s\S]*?<\/\1>\s*/g, '')
  .replace(/<(meta|link)\b[^>]*>\s*/g, '')
  .trim();

// GameMonetize's SDK snippet, as documented: SDK_OPTIONS with the game ID and an
// onEvent handler, then their loader. Events are queued until the game loads
// (portals/gamemonetize/portal.js replays them), since SDK_READY can come first.
const sdk = `<script type="text/javascript">
  window.__gmEvents = window.__gmEvents || [];
  window.SDK_OPTIONS = {
    gameId: "${GAME_ID}",
    onEvent: function (a) {
      // SDK_READY, SDK_GAME_PAUSE, SDK_GAME_START, SDK_ERROR...: handled by the game once it has loaded.
      window.__gmEvents.push(a);
    }
  };
  (function (a, b, c) {
    var d = a.getElementsByTagName(b)[0];
    a.getElementById(c) || (a = a.createElement(b), a.id = c, a.src = "https://api.gamemonetize.com/sdk.js", d.parentNode.insertBefore(a, d));
  })(document, "script", "gamemonetize-sdk");
</script>`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Castle Cascade</title>
<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
<link rel="stylesheet" href="${cssFile}">
${sdk}
</head>
<body>
${body}
<script src="${jsFile}"></script>
</body>
</html>
`;
write('index.html', html);

// Guard rails: nothing absolute, nothing pointing at other sites.
const all = html + css + js;
const bad = [/\b(src|href)="\//, /url\(\//, /fonts\.googleapis|fonts\.gstatic/, /play\.google\.com|apps\.apple\.com/, /<iframe/i, /requestFullscreen/];
for (const re of bad) if (re.test(all)) throw new Error('GameMonetize build contains ' + re);

if (!process.argv.includes('--no-zip')) {
  fs.mkdirSync(path.dirname(zipFile), { recursive: true });
  const py = process.platform === 'win32' ? 'python' : 'python3';
  execFileSync(py, ['-I', path.join(__dirname, 'zip-portal.py'), out, zipFile], { stdio: 'inherit' });
}
