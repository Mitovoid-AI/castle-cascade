// Builds everything that ships:
//   docs/  the website served by GitHub Pages
//     index.html           landing page (from site/index.html)
//     play.html            the whole game in one file
//     privacy-policy.html  terms.html   (from js/legal.js)
//     assets/art.js        icon drawing used by the landing page
//   www/   the web layer of the iOS and Android apps (Capacitor webDir):
//     index.html           the game with fonts bundled for offline play
//     native.js            src/native.js bundled: ads, purchases, back button
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'docs');
const writeTo = (dir, label) => (rel, data) => {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), data);
  console.log(label + '/' + rel, (data.length / 1024).toFixed(1) + ' KB');
};
const write = writeTo(out, 'docs');

// The game: index.html with its CSS and scripts inlined.
let game = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
game = game.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (_, f) => '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '</style>');
game = game.replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
const shell = (body) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' +
  '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n' +
  '</head>\n<body>\n' + body + '\n</body>\n</html>\n';
write('play.html', shell(game));

// App build: no network needed for fonts, and the native layer loads first.
const app = writeTo(path.join(root, 'www'), 'www');
const fontFaces = '<style>' +
  '@font-face{font-family:"Lilita One";src:url(fonts/LilitaOne-latin.woff2) format("woff2");font-weight:400;font-display:swap}' +
  '@font-face{font-family:"Nunito";src:url(fonts/Nunito-latin.woff2) format("woff2");font-weight:200 1000;font-display:swap}' +
  '</style>\n<script src="native.js"></script>';
const appGame = game.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, fontFaces);
app('index.html', shell(appGame));
for (const f of fs.readdirSync(path.join(root, 'assets', 'fonts'))) app('fonts/' + f, fs.readFileSync(path.join(root, 'assets', 'fonts', f)));
const bundle = require('esbuild').buildSync({
  entryPoints: [path.join(root, 'src', 'native.js')],
  bundle: true, format: 'iife', minify: true, target: ['chrome89', 'safari15'], write: false,
});
app('native.js', bundle.outputFiles[0].text);

// Landing page and the icon code it uses.
write('index.html', fs.readFileSync(path.join(root, 'site', 'index.html'), 'utf8'));
write('assets/art.js', fs.readFileSync(path.join(root, 'js', 'art.js'), 'utf8'));

// Legal pages, at stable URLs for the Play Console privacy policy field.
const legal = require(path.join(root, 'js', 'legal.js'));
const C = legal.CONFIG;
const page = (title, body) => '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>' + title + ' – ' + C.game + '</title>\n' +
  '<style>:root{color-scheme:light;--ink:#2a1840;--soft:#6b4f7a;--accent:#6b2aa6;--bg:#fffaf0}' +
  'body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
  'main{max-width:68ch;margin:0 auto;padding:32px max(16px,env(safe-area-inset-right,0px)) 48px max(16px,env(safe-area-inset-left,0px))}' +
  'h1{font-size:30px;line-height:1.2;margin:0 0 4px}h3{font-size:19px;margin:28px 0 6px;color:var(--accent)}' +
  'p,ul{margin:0 0 12px}ul{padding-left:22px}li{margin-bottom:4px}a{color:var(--accent)}.lmeta{color:var(--soft);font-size:14px}' +
  'mark.fill{background:#ffe27a;padding:0 4px;border-radius:4px}nav{display:flex;flex-wrap:wrap;gap:4px 16px;margin-bottom:24px;font-size:14px}' +
  'footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8dcc4;font-size:14px;color:var(--soft)}</style>\n' +
  '</head>\n<body>\n<main>\n<nav><a href="index.html">' + C.game + '</a><a href="privacy-policy.html">Privacy Policy</a><a href="terms.html">Terms of Service</a></nav>\n' +
  '<h1>' + title + '</h1>\n' + body + '\n<footer>© 2026 ' + C.developer + ' · <a href="mailto:' + C.email + '">' + C.email + '</a></footer>\n</main>\n</body>\n</html>\n';
for (const [file, key] of [['privacy-policy.html', 'privacy'], ['terms.html', 'terms']]) {
  const d = legal.DOCS[key];
  write(file, page(d.title, d.html()));
}

// Serve files as-is (no Jekyll processing on GitHub Pages).
write('.nojekyll', '');

const blanks = ['developer', 'email', 'country'].filter((k) => !C[k]);
if (blanks.length) console.log('Fill in js/legal.js CONFIG before publishing to a store: ' + blanks.join(', '));
