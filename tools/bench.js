const L = require('../js/levels.js');
const bot = require('./bot.js');
const t0 = Date.now();
const med = (a) => { const b = a.map(x => x == null ? 999 : x).sort((x, y) => x - y); return b[b.length >> 1]; };
const list = process.argv[2] ? process.argv[2].split(',').map(Number) : [1,2,3,4,5,6,7,8,9,10,12,15,22,27,31,38,46,53,64,75,99,100,131,150,177,233,300,456,500,777,999,1203,1350,1500];
for (const n of list) {
  const lvl = L.gen(n, 0);
  const used = [];
  for (let k = 0; k < 6; k++) used.push(bot.play(lvl, n * 1000 + k, 100));
  console.log([n, lvl.kind, lvl.cols + 'x' + lvl.rows, lvl.colors, lvl.goals.map(g => g.type + (g.type==='color'?g.color:'') + ':' + (g.count||'')).join(' '), 'med', med(used), '[' + used.join(',') + ']'].join(' | '));
}
console.log('ms', Date.now() - t0);
