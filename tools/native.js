// Writes the native settings the ads need into the Android and iOS projects:
// the AdMob app ID, portrait-only orientation, and (iOS) the tracking prompt
// text and Google's SKAdNetwork ID. Safe to run repeatedly; `npm run sync` runs it.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');

const TRACKING_TEXT = 'Allowing tracking lets us show you ads that fit your interests. You can play either way.';

function patchAndroid(appId) {
  const file = path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (!fs.existsSync(file)) return console.log('android: no project, skipped');
  let xml = fs.readFileSync(file, 'utf8');
  const meta = '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="' + appId + '" />';
  if (/com\.google\.android\.gms\.ads\.APPLICATION_ID/.test(xml)) {
    xml = xml.replace(/<meta-data android:name="com\.google\.android\.gms\.ads\.APPLICATION_ID"[^>]*\/>/, meta);
  } else {
    xml = xml.replace(/(\s*)<\/application>/, '\n        ' + meta + '$1</application>');
  }
  if (!/android:screenOrientation=/.test(xml)) {
    xml = xml.replace('android:name=".MainActivity"', 'android:name=".MainActivity"\n            android:screenOrientation="portrait"');
  }
  fs.writeFileSync(file, xml);
  console.log('android: AdMob app ID ' + appId + ', portrait');
}

function setPlistKey(plist, key, valueXml) {
  const re = new RegExp('\\t<key>' + key.replace(/[~]/g, '\\$&') + '</key>\\n\\t(<array>[\\s\\S]*?</array>|<string>[^<]*</string>|<true/>|<false/>)\\n');
  const entry = '\t<key>' + key + '</key>\n\t' + valueXml + '\n';
  if (re.test(plist)) return plist.replace(re, entry);
  return plist.replace(/<\/dict>\s*<\/plist>\s*$/, entry + '</dict>\n</plist>\n');
}

function patchIos(appId) {
  const file = path.join(root, 'ios', 'App', 'App', 'Info.plist');
  if (!fs.existsSync(file)) return console.log('ios: no project, skipped');
  let plist = fs.readFileSync(file, 'utf8');
  plist = setPlistKey(plist, 'GADApplicationIdentifier', '<string>' + appId + '</string>');
  plist = setPlistKey(plist, 'NSUserTrackingUsageDescription', '<string>' + TRACKING_TEXT + '</string>');
  // Google's own network ID; add the third-party list from the AdMob iOS guide if you use mediation.
  plist = setPlistKey(plist, 'SKAdNetworkItems', '<array>\n\t\t<dict>\n\t\t\t<key>SKAdNetworkIdentifier</key>\n\t\t\t<string>cstr6suwn9.skadnetwork</string>\n\t\t</dict>\n\t</array>');
  plist = setPlistKey(plist, 'UISupportedInterfaceOrientations', '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t</array>');
  plist = setPlistKey(plist, 'UISupportedInterfaceOrientations~ipad', '<array>\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t\t<string>UIInterfaceOrientationPortraitUpsideDown</string>\n\t</array>');
  // Portrait-only iPad apps must opt out of split-screen multitasking.
  plist = setPlistKey(plist, 'UIRequiresFullScreen', '<true/>');
  fs.writeFileSync(file, plist);
  console.log('ios: AdMob app ID ' + appId + ', tracking text, SKAdNetwork, portrait');
}

import(pathToFileURL(path.join(root, 'src', 'config.js')).href).then(({ default: config }) => {
  patchAndroid(config.admob.android.appId);
  patchIos(config.admob.ios.appId);
  if (config.testAds) console.log('note: testAds is on (Google test ads). Switch it off with your real IDs before releasing.');
});
