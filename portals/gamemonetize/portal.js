/* Castle Cascade — GameMonetize ad breaks. Only the GameMonetize build
 * (tools/build-gamemonetize.js) includes this file.
 *
 * index.html loads GameMonetize's SDK and queues its events in
 * window.__gmEvents, because SDK_READY can fire before the game has loaded.
 * This file replays that queue and handles new events from then on.
 *
 * The game calls CCPortal.adBreak() only at natural breaks (level start and
 * level end) and waits for it. An ad plays at most once every 90 seconds.
 * While an ad plays the game is paused, muted and takes no input.
 */
(function (root) {
  'use strict';

  const MIN_GAP_MS = 90 * 1000;   // at most one ad every 90 seconds
  const NO_AD_MS = 4 * 1000;      // the SDK says nothing when it has no ad
  const AD_MAX_MS = 120 * 1000;   // never stay paused longer than this

  let ready = false;
  let lastAdAt = -Infinity;
  let paused = false;
  let waiting = null;             // resolves the current adBreak() promise
  let noAdTimer = 0, maxTimer = 0;
  let hooks = { pause() {}, resume() {} };

  // Blocks every tap, click and key while an ad plays.
  const shield = document.createElement('div');
  shield.setAttribute('aria-hidden', 'true');
  shield.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:none;background:transparent;touch-action:none';
  const swallowKey = (e) => { if (shield.style.display !== 'none') { e.preventDefault(); e.stopImmediatePropagation(); } };
  root.addEventListener('keydown', swallowKey, true);
  root.addEventListener('keyup', swallowKey, true);
  (document.body || document.documentElement).appendChild(shield);

  function pause() {
    if (paused) return;
    paused = true;
    api.paused = true;
    shield.style.display = 'block';
    try { hooks.pause(); } catch (e) { /* keep going */ }
    clearTimeout(maxTimer);
    maxTimer = setTimeout(resume, AD_MAX_MS);
  }

  // Ends the ad break: resume, unmute, accept input, let the game carry on.
  function resume() {
    clearTimeout(noAdTimer);
    clearTimeout(maxTimer);
    shield.style.display = 'none';
    if (paused) {
      paused = false;
      api.paused = false;
      try { hooks.resume(); } catch (e) { /* keep going */ }
    }
    const done = waiting;
    waiting = null;
    if (done) done();
  }

  function onEvent(event) {
    const name = event && event.name;
    if (name === 'SDK_READY') ready = true;
    else if (name === 'SDK_GAME_PAUSE') {
      // An ad starts (also one the SDK shows on its own).
      clearTimeout(noAdTimer);
      lastAdAt = Date.now();
      pause();
    } else if (name === 'SDK_GAME_START' || name === 'SDK_ERROR') {
      resume();
    }
  }

  const api = {
    paused: false,

    // The game passes its pause and resume (mute and unmute) actions.
    connect(h) {
      hooks = Object.assign({ pause() {}, resume() {} }, h);
      if (paused) hooks.pause();
    },

    // Called at a natural break. Resolves when the game may carry on.
    adBreak() {
      if (waiting || paused) return Promise.resolve();
      if (!ready || Date.now() - lastAdAt < MIN_GAP_MS) return Promise.resolve();
      const sdk = root.sdk;
      if (!sdk || typeof sdk.showBanner !== 'function') return Promise.resolve();
      return new Promise((resolve) => {
        waiting = resolve;
        shield.style.display = 'block';
        noAdTimer = setTimeout(() => { if (!paused) resume(); }, NO_AD_MS);
        try { sdk.showBanner(); } catch (e) { resume(); }
      });
    },
  };
  root.CCPortal = api;

  // Replay the events that arrived before the game loaded, then take new ones.
  const queued = root.__gmEvents || [];
  root.__gmEvents = { push: onEvent };
  for (const e of queued) onEvent(e);
})(window);
