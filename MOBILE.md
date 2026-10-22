# Castle Cascade on Android and iOS

One codebase, three targets. The game in `index.html` + `js/` + `css/` is the same everywhere; Capacitor wraps it in a native shell:

| Folder | What it is |
| --- | --- |
| `android/` | Android Studio project (package `com.mitovoid.castlecascade`) |
| `ios/` | Xcode project (bundle ID `com.mitovoid.castlecascade`, Swift Package Manager, no CocoaPods) |
| `www/` | generated web layer the apps load (do not edit; `npm run build` writes it) |
| `src/native.js` | ads (AdMob), Remove Ads purchase (RevenueCat), back button |
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
- Between-level ads start at level 15, at most every 3 finished levels, never twice within 2 minutes, and never for players who bought Remove Ads.

## 2. RevenueCat (Remove Ads, pricing, analytics)

1. **Create the products in each store**
   - Google Play Console → Monetize → In-app products → product ID `remove_ads` (one-time).
   - App Store Connect → In-App Purchases → **Non-Consumable**, product ID `remove_ads`.
   Prices are set here, per country.
2. **Connect the stores to RevenueCat**: in your RevenueCat project add a *Play Store* app (package `com.mitovoid.castlecascade`, plus a Google service-account JSON) and an *App Store* app (bundle ID `com.mitovoid.castlecascade`, plus an App Store Connect in-app purchase key).
3. **Entitlement**: create `no_ads` and attach both `remove_ads` products.
4. **Offering**: make the `default` offering current and add a **Lifetime** package containing both products. The game shows that package's store price.
5. **Keys**: Project settings → API keys → copy the public SDK keys (`goog_…`, `appl_…`) into `src/config.js`, then `npm run sync`.

What you get in RevenueCat:
- **Charts**: revenue, conversion, purchases by country and store.
- **Experiments**: try different prices by pointing offerings at different products, without shipping an update.
- **Customer attribute `highest_level`**: the game reports how far each player got, so you can see where buyers are in the game.

Settings in the app includes **Restore purchases**, which Apple requires.

## 3. Google Play release

- Create a signing key and use **Play App Signing**; build a release bundle in Android Studio (Build → Generate Signed App Bundle).
- New personal accounts need a closed test with **12 testers for 14 days** before production.
- Store listing: privacy policy URL `https://ashutoshroy02.github.io/castle-cascade/privacy-policy.html`.
- **Data safety**: declare Device or other IDs (advertising ID, used by AdMob), Purchase history (RevenueCat/Play), App interactions (ads); data is not sold.
- **Target audience**: 13+ (keeps the game out of the Designed for Families ad rules). Content rating questionnaire: puzzle, no violence.

## 4. iOS release (needs a Mac)

1. Join the Apple Developer Program.
2. On a Mac with Xcode: `npm install`, `npm run ios`, pick your team under Signing & Capabilities, add the **In-App Purchase** capability.
3. Archive and upload to App Store Connect, then fill in **App Privacy** (identifiers for ads, purchase history), age rating, and the in-app purchase review screenshot.

No Mac? Cloud Macs work too: GitHub Actions `macos` runners, Codemagic or Ionic Appflow can build and upload the same `ios/` project.

## Before every release

- [ ] `testAds: false` with real AdMob IDs, `npm run sync`
- [ ] Real RevenueCat keys, Remove Ads bought and restored on a test account
- [ ] GDPR message published in AdMob
- [ ] Version bumped (Android `versionCode`/`versionName` in `android/app/build.gradle`, iOS in Xcode)
- [ ] `npm run build` and the website pushed so the privacy policy matches the app
