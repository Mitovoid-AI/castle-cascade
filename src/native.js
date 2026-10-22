/* Castle Cascade — native layer for the iOS and Android apps:
 * AdMob ads (with the consent form and iOS tracking prompt), Castle Cascade
 * Pro through RevenueCat (paywall, Customer Center), and app lifecycle / back button.
 * tools/build.js bundles this into www/native.js. In a browser it does
 * nothing, so the web game simply has no ads or purchases.
 * The game talks to it through window.CCNative (see js/app.js).
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import {
  AdMob, AdmobConsentStatus, MaxAdContentRating, RewardAdPluginEvents, InterstitialAdPluginEvents,
} from '@capacitor-community/admob';
import { Purchases, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import { RevenueCatUI, PAYWALL_RESULT } from '@revenuecat/purchases-capacitor-ui';
import CONFIG from './config.js';

if (Capacitor.isNativePlatform()) {
  const platform = Capacitor.getPlatform();
  const ids = CONFIG.admob[platform];
  const state = {
    adsOn: false, rewardedReady: false, interstitialReady: false,
    // noAds: the player has Castle Cascade Pro. proUntil: renewal or expiry
    // date of a subscription (empty for lifetime). canBuy: an offering loaded.
    noAds: false, proUntil: '', canBuy: false, price: '', privacyChoices: false,
  };
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(state); } catch (e) { /* listener errors stay local */ } });
  let started = false;

  // ---------- purchases (RevenueCat) ----------

  const rc = CONFIG.revenuecat;
  const rcKey = (rc.useTestStore ? rc.testStore : rc[platform]) || '';
  const rcEnabled = rcKey && !/REPLACE/.test(rcKey);
  let rcReady = false;
  let offering = null;

  function applyCustomer(info) {
    const active = info && info.entitlements && info.entitlements.active;
    const pro = active && active[CONFIG.entitlement];
    state.noAds = !!pro;
    state.proUntil = pro && pro.expirationDate ? pro.expirationDate : '';
    emit();
  }

  // Shortest price to show on a button: the monthly price if there is one,
  // otherwise whatever the offering has (the paywall shows every plan).
  function priceLabel(o) {
    if (!o) return '';
    if (o.monthly) return o.monthly.product.priceString + '/mo';
    const p = o.lifetime || o.availablePackages[0];
    return p ? p.product.priceString : '';
  }

  async function loadOffering() {
    const offerings = await Purchases.getOfferings();
    offering = (offerings && offerings.current) || null;
    state.canBuy = !!(offering && offering.availablePackages.length);
    state.price = priceLabel(offering);
    emit();
  }

  async function startPurchases() {
    if (!rcEnabled) return;
    try {
      await Purchases.configure({ apiKey: rcKey });
      rcReady = true;
      await Purchases.addCustomerInfoUpdateListener(applyCustomer);
      const { customerInfo } = await Purchases.getCustomerInfo();
      applyCustomer(customerInfo);
      await loadOffering();
    } catch (e) {
      console.warn('[purchases] ' + (e && e.message));
    }
  }

  function errorResult(e) {
    const code = e && String(e.code);
    if (e && e.userCancelled || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return 'cancelled';
    if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return 'pending';
    if (code === PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) return 'owned';
    return 'error';
  }

  async function refreshCustomer() {
    const { customerInfo } = await Purchases.getCustomerInfo();
    applyCustomer(customerInfo);
  }

  // Without a dashboard paywall the lifetime plan is bought directly.
  async function buyDirect() {
    const pkg = offering && (offering.lifetime || offering.availablePackages[0]);
    if (!pkg) return 'unavailable';
    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      applyCustomer(customerInfo);
      return state.noAds ? 'ok' : 'pending';
    } catch (e) {
      return errorResult(e);
    }
  }

  // Opens the RevenueCat paywall (designed in the dashboard) with every plan.
  async function buyNoAds() {
    if (!rcReady) return 'unavailable';
    if (state.noAds) return 'ok';
    if (!offering) await loadOffering().catch(() => {});
    try {
      const { result } = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: CONFIG.entitlement,
        displayCloseButton: true,
      });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await refreshCustomer();
        return state.noAds ? 'ok' : 'pending';
      }
      if (result === PAYWALL_RESULT.NOT_PRESENTED) { await refreshCustomer(); return state.noAds ? 'ok' : 'error'; }
      if (result === PAYWALL_RESULT.CANCELLED) return 'cancelled';
      return 'error';
    } catch (e) {
      console.warn('[paywall] ' + (e && e.message));
      return buyDirect();
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

  // Customer Center: cancel, change plan, request a refund or restore.
  async function manage() {
    if (!rcReady) return 'unavailable';
    try {
      await RevenueCatUI.presentCustomerCenter();
      await refreshCustomer();
      return 'ok';
    } catch (e) {
      console.warn('[customer center] ' + (e && e.message));
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
    manage,
    privacyChoices,
    track,
    onBack(fn) { backHandler = fn; },
    onPause(fn) { App.addListener('pause', fn); },
    onResume(fn) { App.addListener('resume', fn); },
  };
}
