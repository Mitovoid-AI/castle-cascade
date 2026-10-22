// Ads and purchases for the iOS and Android apps. The web version ignores this file.
//
// testAds: true makes every ad a Google TEST ad, which is safe to tap; use it
// while testing on your own phone. Release builds need testAds: false.
// Never tap real ads in your own app: AdMob can suspend the account.
// App IDs (the ones with "~") are also written into AndroidManifest.xml and
// Info.plist by `npm run sync` (tools/native.js).
// The iOS IDs below are still Google's samples, which always serve test ads.
export default {
  testAds: false,

  admob: {
    android: {
      appId: 'ca-app-pub-7603754372960896~4170468776',
      interstitial: 'ca-app-pub-7603754372960896/1627146044',
      rewarded: 'ca-app-pub-7603754372960896/1544305432',
    },
    ios: {
      appId: 'ca-app-pub-3940256099942544~1458002511',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
      rewarded: 'ca-app-pub-3940256099942544/1712485313',
    },
  },

  // RevenueCat → Project settings → API keys (the public SDK keys).
  // While useTestStore is true both apps use the Test Store key: RevenueCat
  // simulates purchases, so no Play or App Store setup is needed to try them.
  // Never release with it: set useTestStore: false and fill in the store keys.
  revenuecat: {
    // false + placeholder store keys = no purchase buttons (the public APK on
    // GitHub, where Google Play billing is not available).
    useTestStore: false,
    testStore: 'test_ZQRBYdTtYfqrvxnSXbykdNCVnxt',
    android: 'goog_REPLACE_WITH_YOUR_KEY',
    ios: 'appl_REPLACE_WITH_YOUR_KEY',
  },
  // Entitlement for Castle Cascade Pro (no between-level ads). Attach the
  // lifetime, yearly and monthly products to it.
  entitlement: 'castle_cascade_pro',

  // Between-level ads: never before this level, at most every N finished
  // levels, and never twice within this many seconds.
  interstitial: { fromLevel: 15, everyLevels: 3, minSeconds: 120 },
};
