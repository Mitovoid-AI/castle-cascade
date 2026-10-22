/* Castle Cascade — native layer for the iOS and Android apps:
 * AdMob ads (with the consent form and iOS tracking prompt), the RevenueCat
 * "Remove Ads" purchase, and app lifecycle / back button.
 * tools/build.js bundles this into www/native.js. In a browser it does
 * nothing, so the web game simply has no ads or purchases.
 * The game talks to it through window.CCNative (see js/app.js).
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  AdMob, AdmobConsentStatus, MaxAdContentRating, RewardAdPluginEvents, InterstitialAdPluginEvents,
} from '@capacitor-community/admob';
import { Purchases } from '@revenuecat/purchases-capacitor';
import CONFIG from './config.js';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform();
  const ids = CONFIG.admob[platform];
  const state = {
    adsOn: false, rewardedReady: false, interstitialReady: false,
    noAds: false, canBuy: false, price: '', privacyChoices: false,
  };
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(state); } catch (e) { /* listener errors stay local */ } });
  let started = false;

  // ---------- purchases (RevenueCat) ----------

  const rcKey = CONFIG.revenuecat[platform] || '';
  const rcEnabled = rcKey && !/REPLACE/.test(rcKey);
  let rcReady = false;
  let removeAdsPackage = null;

  function applyCustomer(info) {
    const active = info && info.entitlements && info.entitlements.active;
    state.noAds = !!(active && active[CONFIG.entitlement]);
    emit();
  }

  async function startPurchases() {
    if (!rcEnabled) return;
    try {
      await Purchases.configure({ apiKey: rcKey });
      rcReady = true;
      const { customerInfo } = await Purchases.getCustomerInfo();
      applyCustomer(customerInfo);
      await Purchases.addCustomerInfoUpdateListener(applyCustomer);
      // The current offering's lifetime package is the one-time "Remove Ads".
      const offerings = await Purchases.getOfferings();
      const current = offerings && offerings.current;
      removeAdsPackage = current ? (current.lifetime || current.availablePackages[0] || null) : null;
      state.canBuy = !!removeAdsPackage;
      state.price = removeAdsPackage ? removeAdsPackage.product.priceString : '';
      emit();
    } catch (e) {
      console.warn('[purchases] ' + (e && e.message));
    }
  }

  async function buyNoAds() {
    if (!removeAdsPackage) return 'unavailable';
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: removeAdsPackage });
      applyCustomer(customerInfo);
      return state.noAds ? 'ok' : 'pending';
    } catch (e) {
      return e && (e.userCancelled || String(e.code) === '1') ? 'cancelled' : 'error';
    }
  }

  async function restore() {
    if (!rcReady) return 'unavailable';
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      applyCustomer(customerInfo);
      return state.noAds ? 'ok' : 'none';
    } catch (e) {
      return 'error';
    }
  }

  // Lets RevenueCat charts segment buyers by how far they got.
  function track(level) {
    if (rcReady) Purchases.setAttributes({ highest_level: String(level) }).catch(() => {});
  }

  // ---------- ads (AdMob) ----------

  let rewardedLoading = false, interstitialLoading = false;
  let rewardedRetry = 0, interstitialRetry = 0;
  let pendingReward = null, earned = false, pendingInterstitial = null;
  let levelsSinceAd = 0, lastAdAt = 0;

  function loadRewarded() {
    if (!state.adsOn || rewardedLoading || state.rewardedReady) return;
    rewardedLoading = true;
    AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: CONFIG.testAds })
      .then(() => { state.rewardedReady = true; rewardedRetry = 0; emit(); })
      .catch(() => setTimeout(loadRewarded, Math.min(300000, 15000 * 2 ** rewardedRetry++)))
      .finally(() => { rewardedLoading = false; });
  }

  function loadInterstitial() {
    if (!state.adsOn || state.noAds || interstitialLoading || state.interstitialReady) return;
    interstitialLoading = true;
    AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: CONFIG.testAds })
      .then(() => { state.interstitialReady = true; interstitialRetry = 0; })
      .catch(() => setTimeout(loadInterstitial, Math.min(300000, 15000 * 2 ** interstitialRetry++)))
      .finally(() => { interstitialLoading = false; });
  }

  function finishReward() {
    const done = pendingReward;
    pendingReward = null;
    lastAdAt = Date.now();
    // The reward event can land just after the close event.
    if (done) setTimeout(() => done(earned), 300);
    loadRewarded();
  }

  function finishInterstitial() {
    const done = pendingInterstitial;
    pendingInterstitial = null;
    if (done) done();
    loadInterstitial();
  }

  async function gatherConsent() {
    let info = await AdMob.requestConsentInfo();
    if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) info = await AdMob.showConsentForm();
    // PrivacyOptionsRequirementStatus is a type-only enum in the plugin, so compare the string.
    state.privacyChoices = info.privacyOptionsRequirementStatus === 'REQUIRED';
    return info;
  }

  async function startAds() {
    try {
      let info;
      try {
        info = await gatherConsent();
        await AdMob.initialize({ initializeForTesting: CONFIG.testAds, maxAdContentRating: MaxAdContentRating.ParentalGuidance });
      } catch (e) {
        // Some SDK versions want initialize() before the consent calls.
        await AdMob.initialize({ initializeForTesting: CONFIG.testAds, maxAdContentRating: MaxAdContentRating.ParentalGuidance });
        info = await gatherConsent();
      }
      if (platform === 'ios') {
        const t = await AdMob.trackingAuthorizationStatus();
        if (t.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      }
      if (!info.canRequestAds) { emit(); return; }
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { earned = true; });
      AdMob.addListener(RewardAdPluginEvents.Dismissed, finishReward);
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, finishReward);
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finishInterstitial);
      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finishInterstitial);
      state.adsOn = true;
      emit();
      loadRewarded();
      loadInterstitial();
    } catch (e) {
      console.warn('[ads] ' + (e && e.message));
      emit();
    }
  }

  // Opt-in ad for a reward. Resolves true only if the player earned it.
  function showRewarded() {
    if (!state.adsOn || !state.rewardedReady || pendingReward) return Promise.resolve(false);
    earned = false;
    state.rewardedReady = false;
    emit();
    return new Promise((resolve) => {
      pendingReward = resolve;
      AdMob.showRewardVideoAd()
        .then((item) => { if (item && item.amount != null) earned = true; })
        .catch(finishReward);
    });
  }

  // Called when the player leaves a finished level; may show a between-level ad.
  function afterLevel(level) {
    if (!state.adsOn || state.noAds) return Promise.resolve();
    levelsSinceAd++;
    const rule = CONFIG.interstitial;
    if (level < rule.fromLevel || levelsSinceAd < rule.everyLevels) return Promise.resolve();
    if (Date.now() - lastAdAt < rule.minSeconds * 1000 || !state.interstitialReady) return Promise.resolve();
    levelsSinceAd = 0;
    lastAdAt = Date.now();
    state.interstitialReady = false;
    return new Promise((resolve) => {
      pendingInterstitial = resolve;
      AdMob.showInterstitial().catch(finishInterstitial);
    });
  }

  async function privacyChoices() {
    try { await AdMob.showPrivacyOptionsForm(); } catch (e) { /* form not available here */ }
  }

  // ---------- app lifecycle ----------

  let backHandler = null;
  App.addListener('backButton', () => {
    if (backHandler && backHandler()) return;
    App.minimizeApp();
  });

  window.CCNative = {
    platform,
    state,
    // Call once the player is past the launch screen.
    start() {
      if (started) return;
      started = true;
      startPurchases();
      startAds();
    },
    onChange(fn) { listeners.add(fn); },
    canReward: () => state.adsOn && state.rewardedReady && !pendingReward,
    showRewarded,
    afterLevel,
    buyNoAds,
    restore,
    privacyChoices,
    track,
    onBack(fn) { backHandler = fn; },
    onPause(fn) { App.addListener('pause', fn); },
    onResume(fn) { App.addListener('resume', fn); },
  };
}
