# Castle Cascade

An original match-3 game: swap pieces, build boosters, clear obstacles, win stars, restore the castle. 1,500 tuned levels plus endless generated ones. Plain HTML/JS, no dependencies, no image files.

By Mitovoid AI · contact: mitovoid.contact@gmail.com

## Play

- Online: the GitHub Pages site serves `docs/` (landing page, `play.html`, privacy policy, terms).
- Offline: open `docs/play.html` in any browser (the whole game in one file).
- Development: serve the folder and open `index.html`: `python -m http.server 8765`.
- Jump to any level while testing: open the page with `#lv250`.

## Android and iOS apps

The same game ships as native apps through Capacitor, with AdMob ads and Castle Cascade Pro (no between-level ads; lifetime, yearly or monthly) through RevenueCat. See [MOBILE.md](MOBILE.md) for building, ad and purchase setup, and store release steps.

## Website (`docs/`)

`node tools/build.js` regenerates everything in `docs/`:

| File | Source |
| --- | --- |
| `index.html` | landing page, `site/index.html` |
| `play.html` | the game: `index.html` with `css/` and `js/` inlined |
| `privacy-policy.html`, `terms.html` | `js/legal.js` (fill in `CONFIG`; flip `ads` / `purchases` when you add them) |
| `assets/art.js` | copy of `js/art.js`, draws the landing page icons |

Use `https://<user>.github.io/castle-cascade/privacy-policy.html` as the privacy policy URL in Play Console.

## What's in it

| Mechanic | How it works |
| --- | --- |
| Match 3 | Swipe or tap two neighbours |
| Comet | Line of 4. Streaks across a row or column |
| Dragonfly | 2×2 square. Flies to a goal tile |
| Powder Keg | L or T shape. 5×5 blast |
| Prism | Line of 5. Clears every piece of one colour |
| Combos | Swap two boosters together (comet+comet cross, keg+keg 7×7, prism + booster turns a colour into boosters, prism ×2 clears the board) |
| In-game boosters | Mallet (one tile), Lance (a row), Anvil (a column), Shuffle; none use a move |
| Obstacles | Crates (1–3 hits), moss, chains, stone (boosters only), crowns to bring to the bottom |
| Rewards | Coins and a star every win, unused moves become comets in the Grand Finale, level chest every 10 wins, win-streak boosters, daily gift, castle areas to rebuild with stars, achievements |

Internal piece codes (`rh`/`rv`, `tnt`, `pr`, `lb`) and save keys (`rocket`, `hammer`, `arrow`, `cannon`) keep their original names so existing saves still load; only player-facing names and art changed.
| Lives | 5 lives, one lost on a fail, refill every 30 min |

## Files

- `js/engine.js` – game rules, no DOM; records events for the renderer
- `js/levels.js` – seeded level generator (shapes, obstacles, goals, difficulty curve)
- `js/level-table.js` – generated move counts per level
- `js/board.js` – canvas renderer, animations, input
- `js/art.js` – all pieces and icons drawn in code
- `js/audio.js` – synthesized sound effects
- `js/app.js` – screens, economy, rewards, profile, achievements, saving
- `js/legal.js` – privacy policy, terms of service and credits
- `site/index.html` – landing page source
- `tools/` – `tune.js` (bot playtests every level and writes `level-table.js`), `smoke.js` (random-play invariant test), `bot.js`, `build.js` (builds `docs/`)

## Rebalancing levels

Change the generator in `js/levels.js`, then:

```bash
node tools/smoke.js
node tools/tune.js 1500 8
node tools/build.js
```

`tune.js` runs a greedy bot 8 times per level (about 2.5 minutes on 4 cores) and sets each level's moves from how many the bot needed: generous on normal levels, tight on every 10th (hard) and 50th (super hard) level.
