# Castle Cascade on Android and iOS

One codebase, three targets. The game in `index.html` + `js/` + `css/` is the same everywhere; Capacitor wraps it in a native shell:

| Folder | What it is |
| --- | --- |
| `android/` | Android Studio project (package `com.mitovoid.castlecascade`) |
| `ios/` | Xcode project (bundle ID `com.mitovoid.castlecascade`, Swift Package Manager, no CocoaPods) |
| `www/` | generated web layer the apps load (do not edit; `npm run build` writes it) |
| `src/native.js` | ads (AdMob), Castle Cascade Pro (RevenueCat paywall and Customer Center), back button |
| `src/config.js` | **all ad unit IDs and RevenueCat keys live here** |

The web version on GitHub Pages has no ads and no purchases; those controls only appear inside the apps.

## Everyday commands

```bash
npm install            # once
npm run sync           # rebuild the game, copy it into both apps, write native ad settings
npm run android        # sync + open Android Studio
npm run ios            # sync + open Xcode (Mac only)
npm run icons          # regenerate app icons and splash screens from tools/icons.js
```

Capacitor 8 needs **Java 21** for Android builds (Android Studio's bundled JDK works). On this Windows machine the path is long enough to break Gradle, so build from a short path, for example with `subst Q: <project folder>`.

## 1. AdMob (ads)

1. Create an account at [admob.google.com](https://admob.google.com) and add **two apps**: Castle Cascade for Android and for iOS.
2. In each app create two ad units: **Interstitial** and **Rewarded**.
3. Paste the four ad unit IDs and the two app IDs (the ones with `~`) into `src/config.js`, set `testAds: false`, then run `npm run sync`.
4. In AdMob, open **Privacy & messaging** and publish a **GDPR message** (and, for iOS, an **IDFA explainer**). Without a published message, EU users get no consent form and see no ads.
5. Later, once you have a website domain for the developer listing, host an `app-ads.txt` file at its root as AdMob instructs.

Ad rules in the game (edit `interstitial` in `src/config.js`):
- Rewarded ads are always optional: +5 moves when out of moves, +1 life when out of lives, double coins after a win.
- Between-level ads start at level 15, at most every 3 finished levels, never twice within 2 minutes, and never for players with Castle Cascade Pro.

## 2. RevenueCat (Castle Cascade Pro, paywall, analytics)

Castle Cascade Pro turns off between-level ads (rewarded ads stay, since they are the player's choice). It is sold three ways, all unlocking the entitlement `castle_cascade_pro`:

| Product ID | Type | RevenueCat package |
| --- | --- | --- |
| `lifetime` | one-time (Play: in-app product; Apple: Non-Consumable) | Lifetime |
| `yearly` | auto-renewing subscription, 1 year | Annual |
| `monthly` | auto-renewing subscription, 1 month | Monthly |

**Testing first (no stores needed).** `src/config.js` has `useTestStore: true` and your RevenueCat **Test Store** key. In the RevenueCat dashboard, under the Test Store app, create the three products above, attach them to `castle_cascade_pro`, and put them in the `default` offering. Purchases in a debug build are then simulated by RevenueCat.

**Then the real stores:**
1. **Create the products in each store** with the IDs above. Google Play only lets you add products after you have uploaded a build. Apple subscriptions go in one subscription group.
2. **Connect the stores to RevenueCat**: add a *Play Store* app (package `com.mitovoid.castlecascade`, plus a Google service-account JSON) and an *App Store* app (bundle ID `com.mitovoid.castlecascade`, plus an App Store Connect in-app purchase key). Import the products and attach them to `castle_cascade_pro`.
3. **Offering**: the `default` offering (marked current) holds the Lifetime, Annual and Monthly packages with the products from every store.
4. **Paywall**: in RevenueCat → Paywalls, design a paywall for the `default` offering. The game opens it from **Settings → Go ad-free with Pro** and from the win screen. Without a paywall, the game buys the Lifetime package directly.
5. **Customer Center**: RevenueCat → Customer Center → configure it (cancel, change plan, refund request, support email `mitovoid.contact@gmail.com`). Pro players open it from **Settings → Manage Pro**.
6. **Keys**: Project settings → API keys → copy the public SDK keys (`goog_…`, `appl_…`) into `src/config.js`, set `useTestStore: false`, then `npm run sync`. RevenueCat does not allow Test Store keys in release builds.

What you get in RevenueCat:
- **Charts**: revenue, MRR, conversion, churn, purchases by country and store.
- **Experiments**: try different prices or paywalls without shipping an update.
- **Customer attribute `highest_level`**: the game reports how far each player got, so you can see where buyers are in the game.

Settings in the app includes **Restore purchases**, which Apple requires. Both stores also require the subscription terms (price, period, auto-renewal, how to cancel) to be visible before purchase: RevenueCat paywall templates show them, and the Terms of Service cover them.

## 3. Google Play release

- Create a signing key and use **Play App Signing**; build a release bundle in Android Studio (Build → Generate Signed App Bundle).
- New personal accounts need a closed test with **12 testers for 14 days** before production.
- Store listing: privacy policy URL `https://mitovoid-ai.github.io/castle-cascade/privacy-policy.html`.
- **Data safety**: declare Device or other IDs (advertising ID, used by AdMob), Purchase history (RevenueCat/Play), App interactions (ads); data is not sold.
- **Target audience**: 13+ (keeps the game out of the Designed for Families ad rules). Content rating questionnaire: puzzle, no violence.

## 4. iOS release (needs a Mac)

1. Join the Apple Developer Program.
2. On a Mac with Xcode: `npm install`, `npm run ios`, pick your team under Signing & Capabilities, add the **In-App Purchase** capability.
3. Archive and upload to App Store Connect, then fill in **App Privacy** (identifiers for ads, purchase history), age rating, and the in-app purchase review screenshot.

No Mac? Cloud Macs work too: GitHub Actions `macos` runners, Codemagic or Ionic Appflow can build and upload the same `ios/` project.

## Before every release

- [ ] `testAds: false` with real AdMob IDs, `npm run sync`
- [ ] `useTestStore: false` with real RevenueCat keys; each Pro plan bought, restored and cancelled on a store test account
- [ ] GDPR message published in AdMob
- [ ] Version bumped (Android `versionCode`/`versionName` in `android/app/build.gradle`, iOS in Xcode)
- [ ] `npm run build` and the website pushed so the privacy policy matches the app
