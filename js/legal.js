/* Castle Cascade — privacy policy, terms of service and credits.
 * Fill in CONFIG before publishing to a store. Flip `ads` / `purchases` on
 * when the app starts showing ads or selling items: the documents update.
 * tools/build.js also writes these as standalone pages for hosting.
 */
(function (root) {
  'use strict';

  const CONFIG = {
    game: 'Castle Cascade',
    developer: 'Mitovoid AI', // trading name; add your legal name once you decide, e.g. "Mitovoid AI (operated by …)"
    email: 'mitovoid.contact@gmail.com',            // support / privacy contact, e.g. "support@yourgame.com"
    country: 'India',          // governing law, e.g. "India"
    updated: '22 October 2026',
    ads: false,           // true once the app shows ads (e.g. Google AdMob)
    purchases: false,     // true once the app sells items through Google Play
    cloudSave: true,      // the web version can save progress to the player's signed-in account
    minAge: 13,
  };

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const fill = (v, label) => (v ? esc(v) : '<mark class="fill">[' + label + ']</mark>');
  const who = () => fill(CONFIG.developer, 'your name or studio');
  const mail = () => (CONFIG.email ? '<a href="mailto:' + esc(CONFIG.email) + '">' + esc(CONFIG.email) + '</a>' : fill('', 'support email'));
  const list = (items) => '<ul>' + items.filter(Boolean).map((x) => '<li>' + x + '</li>').join('') + '</ul>';

  function privacy() {
    const c = CONFIG, g = esc(c.game);
    return [
      '<p class="lmeta">Last updated ' + esc(c.updated) + '</p>',
      '<p>This policy explains what information ' + g + ' (“the game”), made by ' + who() + ' (“we”), uses and why. We keep it short because the game collects very little.</p>',
      '<h3>The short version</h3>',
      list([
        'You do not need an account, and we never ask for your email, phone number or real name.',
        'Your progress is saved on your own device.',
        c.ads ? 'The game shows ads from Google AdMob, which uses device information to show and measure ads (details below).' : 'The game shows no ads.',
        c.purchases ? 'Purchases are handled by Google Play; we never see your payment details.' : 'The game sells nothing.',
        'We do not sell your information.',
      ]),
      '<h3>What the game stores</h3>',
      list([
        '<b>Game progress:</b> your level, coins, stars, boosters, lives, castle rooms, achievements and statistics.',
        '<b>Settings:</b> sound and vibration choices.',
        '<b>Profile:</b> the display name and avatar you pick. The game has no multiplayer, so no other player sees them.',
      ]),
      '<p>This is kept in your device’s storage for the game. It stays there until you reset your progress or remove the game.</p>',
      c.cloudSave ? '<p><b>Cloud save (web version):</b> if you play on a website while signed in to an account with that service, your progress is also saved to that account under an anonymous ID, so it follows you to other devices. It holds only the game progress listed above.</p>' : '',
      c.ads ? '<h3>Advertising</h3><p>We use Google AdMob to show ads. To serve, limit and measure ads, AdMob may collect your device’s advertising ID, IP address, approximate location (from the IP address), device and app information, and how you interact with ads. Where the law requires it (for example in the EEA, the UK and Switzerland), you are asked for consent before personalised ads are shown, and you can change that choice from the game’s settings. You can also reset or delete your advertising ID in your device settings. Google’s use of this data is described at <a href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>.</p>' : '',
      c.purchases ? '<h3>Purchases</h3><p>Purchases are processed by Google Play. We receive a confirmation that a purchase happened so we can deliver it; we never receive your card or bank details. Google’s privacy policy applies to the payment.</p>' : '',
      '<h3>What we do not collect</h3>',
      '<p>The game does not access your contacts, photos, camera, microphone, precise location or files, and it does not track you across other apps or websites' + (c.ads ? ' beyond what the ad provider described above does' : '') + '.</p>',
      '<h3>How the information is used</h3>',
      list([
        'To run the game and remember your progress.',
        c.ads ? 'To show ads and keep their frequency reasonable.' : '',
        c.purchases ? 'To deliver and restore what you buy.' : '',
        'To answer you if you contact us.',
      ]),
      '<h3>Sharing</h3>',
      '<p>We do not sell or rent your information. It is shared only with the services that make the game work' + (c.ads ? ' (Google AdMob for ads' + (c.purchases ? ', Google Play for purchases' : '') + ')' : c.purchases ? ' (Google Play for purchases)' : '') + ', or when the law requires it.</p>',
      '<h3>Keeping and deleting your data</h3>',
      '<p>Open <b>Settings → Reset progress</b> to erase your saved game' + (c.cloudSave ? ', including the cloud copy' : '') + '. Removing the game or clearing its storage also deletes it. If you want us to delete anything else, email ' + mail() + '.</p>',
      '<h3>Children</h3>',
      '<p>The game is not directed at children under ' + c.minAge + ', and we do not knowingly collect personal information from them. If you believe a child has given us personal information, contact ' + mail() + ' and we will delete it.</p>',
      '<h3>Security</h3>',
      '<p>We use reasonable measures to protect the little information the game handles, but no method of storage or transmission is completely secure.</p>',
      '<h3>Your rights</h3>',
      '<p>Depending on where you live (for example under the GDPR or the CCPA), you may have the right to access, correct or delete your personal information, or to object to how it is used. Because your progress lives on your device, you can delete it yourself at any time. For anything else, email ' + mail() + '.</p>',
      '<h3>Changes to this policy</h3>',
      '<p>If this policy changes, we will update the date at the top and, for significant changes, tell you in the game.</p>',
      '<h3>Contact</h3>',
      '<p>' + who() + ' · ' + mail() + '</p>',
    ].join('');
  }

  function terms() {
    const c = CONFIG, g = esc(c.game);
    return [
      '<p class="lmeta">Last updated ' + esc(c.updated) + '</p>',
      '<p>These terms are an agreement between you and ' + who() + ' (“we”) for playing ' + g + '. By playing, you accept them. If you do not agree, please do not play.</p>',
      '<h3>Your licence to play</h3>',
      '<p>We give you a personal, non-exclusive, non-transferable and revocable licence to play the game for your own entertainment. You may not sell, rent, copy or redistribute the game, or use it commercially.</p>',
      '<h3>Virtual items</h3>',
      '<p>Coins, stars, lives, boosters and other in-game items have no real-world value. They cannot be exchanged for money or anything outside the game, and they cannot be transferred to other people. We may change how they work or how many you receive in order to balance the game.</p>',
      c.purchases ? '<h3>Purchases</h3><p>Purchases are made through Google Play and are subject to Google Play’s terms and refund policy. Purchased items are delivered to the game on your device; reinstalling may require “Restore purchases”. Prices are shown in the store before you buy.' + (c.ads ? ' “Remove Ads” removes banner and between-level ads; optional ads you choose to watch for a reward stay available.' : '') + '</p>' : '',
      c.ads ? '<h3>Advertising</h3><p>The game shows ads provided by third parties. We are not responsible for the content of those ads or the websites they lead to. Rewarded ads are always optional.</p>' : '',
      '<h3>Fair play</h3>',
      '<p>Do not cheat, hack, modify the game or its save data, exploit bugs, or reverse engineer the game. We may reset progress that was gained this way.</p>',
      '<h3>Ownership</h3>',
      '<p>The game, including its code, artwork, sounds, levels and name, belongs to ' + who() + ' or its licensors and is protected by copyright and other laws. ' + g + ' is an independent game. It is not affiliated with, endorsed by or connected to any other game, studio or publisher, and any third-party names belong to their owners.</p>',
      '<h3>Saved progress and availability</h3>',
      '<p>Your progress is stored on your device. It can be lost if you clear the game’s storage, reset your device or remove the game, and we cannot restore it. We may update, change or stop offering the game at any time.</p>',
      '<h3>No warranty</h3>',
      '<p>The game is provided “as is” and “as available”, without warranties of any kind, to the fullest extent the law allows. We do not promise it will be uninterrupted or free of errors.</p>',
      '<h3>Limitation of liability</h3>',
      '<p>To the fullest extent the law allows, we are not liable for any indirect, incidental or consequential damages, or for loss of data or progress, arising from your use of the game. Nothing in these terms limits rights you have under consumer law that cannot be limited.</p>',
      '<h3>Ending these terms</h3>',
      '<p>You can stop playing and remove the game at any time. We may end your licence if you break these terms.</p>',
      '<h3>Changes</h3>',
      '<p>We may update these terms. The date at the top shows the latest version; continuing to play after a change means you accept it.</p>',
      '<h3>Governing law</h3>',
      '<p>These terms are governed by the laws of ' + fill(c.country, 'your country') + ', without regard to conflict-of-law rules.</p>',
      '<h3>Contact</h3>',
      '<p>' + who() + ' · ' + mail() + '</p>',
    ].join('');
  }

  function credits() {
    const g = esc(CONFIG.game);
    return [
      '<p>' + g + ' — game design, code, levels and artwork by ' + who() + '.</p>',
      '<h3>Fonts</h3>',
      list([
        '<b>Lilita One</b> by Juan Montoreano, licensed under the SIL Open Font License 1.1.',
        '<b>Nunito</b> by Vernon Adams, Cyreal and Jacques Le Bailly, licensed under the SIL Open Font License 1.1.',
      ]),
      '<p>Both are served by Google Fonts. The licence is at <a href="https://openfontlicense.org">openfontlicense.org</a>.</p>',
      '<h3>Art and sound</h3>',
      '<p>Every piece, booster, obstacle and icon is drawn by the game’s own code, and every sound is synthesized in the game; no third-party images or audio are included. The decorations in the castle rooms use your device’s built-in emoji font.</p>',
      '<h3>Independence</h3>',
      '<p>' + g + ' is an independent game and is not affiliated with or endorsed by any other game, studio or publisher.</p>',
    ].join('');
  }

  const DOCS = {
    privacy: { title: 'Privacy Policy', html: privacy },
    terms: { title: 'Terms of Service', html: terms },
    credits: { title: 'Credits & Licences', html: credits },
  };

  const api = { CONFIG, DOCS };
  root.CCLegal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
