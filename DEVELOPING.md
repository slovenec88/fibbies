# Developing Fibbies

Fibbies is static HTML, CSS and ES modules: no build step and no bundler. The Android app wraps the same code with Capacitor.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173. ES modules need an HTTP server, so opening `index.html` straight from disk won't work.

`gallery.html` is a dev page that renders every pose for checking the figures.

## Tests

```bash
npm test
```

This runs `scripts/selftest.mjs`. The test needs no dependencies. It covers the code that could lose someone's progress:
- saving;
- backup codes;
- restore;
- the cloud-save decisions.

## Where things live

| Area | Files |
|---|---|
| App shell, screens, settings | `index.html`, `styles.css`, `js/app.js` |
| Stretches, routines, rankings | `js/data.js` (see [RANKINGS.md](RANKINGS.md)) |
| Animated figures (two-bone IK) | `js/figure.js` |
| Follow-along session timer | `js/session.js` |
| Chests, multipliers, levels, quests | `js/rewards.js`, `js/reward-screen.js` |
| Procedural Fibbies, merging, evolution | `js/fibbies.js`, `js/critter.js`, `js/merge-fx.js` |
| Flexibility check | `js/flex.js` |
| Saving on the device, backup codes | `js/storage.js` |
| Cloud save (Play Games) | `js/cloud.js`, `android/.../PlayGamesPlugin.java` |
| Sound, voice, haptics | `js/audio.js`, `js/native.js` |
| Translations | English UI text in `js/i18n.js`, English content in `js/data.js` and `js/rewards.js`; each other language is one file in `js/lang/`, swapped in by `js/localize.js` |

## Android app (Capacitor)

The Android app is built from the same web code. Capacitor wraps it in a native shell. Native features are used where they work better than the browser versions:
- text-to-speech;
- haptics;
- keep-awake;
- edge-to-edge system bars;
- the hardware back button;
- a splash screen.

They live in `js/native.js` and do nothing on the web.

**Setup (once):**
1. Install Node.js LTS, JDK 21 and the Android SDK (`ANDROID_HOME`).
2. Run `npm install`.

| Command | What it does |
|---|---|
| `npm run android:debug` | Copy the web app into `www/`, sync it to `android/`, and build `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run android:run` | Build and launch on a connected phone or emulator |
| `npm run android:open` | Open the project in Android Studio |

Change the web code at the repo root, then run `npm run sync`. Don't edit `www/` or `android/app/src/main/assets`; both are generated.

### Optional: cloud save with Google Play Games

The Android app can keep the player's progress (Fibbies, level, history) in their own Google Play Games account through the free [Saved Games](https://developer.android.com/games/pgs/savedgames) service. It's off until the app is set up in the Play Console; until then Settings says "Cloud save isn't set up". Separately, Android's Auto Backup (`allowBackup`) already copies the app's data to the user's Google Drive backup and restores it on a reinstall.

To switch it on:
1. Upload the app to the Play Console (an internal testing track is enough) and add yourself as a tester.
2. In Play Console → **Play Games Services → Setup and management → Configuration**, create a games project for the app.
3. Add an **Android credential** with the app's package name (`appId` in `capacitor.config.json`) and the SHA-1 of the signing key (the upload key's and the Play app signing key's; for debug builds run `cd android && ./gradlew signingReport`).
4. Under **Saved Games**, turn the feature on, then publish the Play Games configuration and add testers.
5. Copy the **project ID** (a number) into `android/gradle.properties` as `playGamesAppId=1234567890`, and rebuild.

`js/cloud.js` handles the syncing. The newest copy wins, and the app asks which copy to keep when two phones both have progress.

## Deploy (web)

**Before every release, bump `VERSION` in `sw.js`.** The service worker serves the app cache-first, so returning users only get changes when the version changes.

Everything is static, so any static host works. GitHub Pages can serve it straight from the `main` branch root.

## Notes

- iOS: audio and voice only start after you tap a button, which the Start button handles. With the hardware mute switch on, sound effects stay silent.
- Wake Lock needs HTTPS (or localhost) and is supported in Chrome, Edge and Safari 16.4+.
- Fonts are bundled in `fonts/` with their licences (SIL Open Font License for Roboto Flex and Bricolage Grotesque, Apache 2.0 for Material Symbols).
