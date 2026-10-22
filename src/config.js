// Ads and purchases for the iOS and Android apps. The web version ignores this file.
//
// Until you paste real IDs, the apps show Google's official TEST ads, which are
// safe to tap. Never ship to the stores with testAds: true.
// App IDs (the ones with "~") are also written into AndroidManifest.xml and
// Info.plist by `npm run sync` (tools/native.js).
export default {
  testAds: true,

  admob: {
    android: {
      appId: 'ca-app-pub-3940256099942544~3347511713',
      interstitial: 'ca-app-pub-3940256099942544/1033173712',
      rewarded: 'ca-app-pub-3940256099942544/5224354917',
    },
    ios: {
      appId: 'ca-app-pub-3940256099942544~1458002511',
      interstitial: 'ca-app-pub-3940256099942544/4411468910',
      rewarded: 'ca-app-pub-3940256099942544/1712485313',
    },
  },

  // RevenueCat → Project settings → API keys (the public SDK keys).
  revenuecat: {
    android: 'goog_REPLACE_WITH_YOUR_KEY',
    ios: 'appl_REPLACE_WITH_YOUR_KEY',
  },
  // Entitlement that removes ads. Attach your "remove_ads" store products to it.
  entitlement: 'no_ads',

  // Between-level ads: never before this level, at most every N finished
  // levels, and never twice within this many seconds.
  interstitial: { fromLevel: 15, everyLevels: 3, minSeconds: 120 },
};
