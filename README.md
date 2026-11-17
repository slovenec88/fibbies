# Fibbies: stretch & loot

A phone-first web app with follow-along stretching routines for runners, wrapped in a treasure-chest reward loop. Every routine runs 5–10 minutes and comes with voice guidance, sound cues, an on-screen timer and animated figures that show each pose. The screen stays awake while you stretch.

## Features

- **12 routines in 4 groups** (After run, Before run, Evening, Quick), each led by a research-ranked **Top 5** routine
- **Top 10 rankings** for each group, ranked by effectiveness versus simplicity (see [RANKINGS.md](RANKINGS.md))
- **32 stretches**, each with an animated figure drawn from joint targets (two-bone IK)
- **Procedural Fibbies**: every chest drops a seeded, code-drawn critter (endless species, 4 rarities). Collect duplicates and merge two identical ones to evolve them, up to 4 stages (`js/fibbies.js`, `js/critter.js`)
- **Treasure-chest rewards** after every session:
  - Four chest tiers (Wooden to Legendary) and a slot-machine count-up of "muscle fibers stretched"
  - Stacking multipliers: streak, Run Sandwich ×2 (warm-up and cooldown on the same day), Flex 60s, perfect session, lucky
  - 12 collectible Fibbie critters, plus XP levels and level-ups
  - Sessions less than half done earn nothing, so skipping can't farm chests
- **Daily quests** (before run, after run, evening) and a Fibbie collection on the home screen
- **Audio**: synthesized chimes, a 3-2-1 countdown, halfway and switch-sides cues, plus spoken names and tips through the Web Speech API
- **Screen Wake Lock**, so the phone doesn't go to sleep mid-stretch
- **Material You styling**: a tonal palette built from a seed hue in OKLCH, light and dark themes, and 8 color choices
- **Installable PWA** that works offline after the first visit
- Hold length setting (short / standard / long), plus an opt-in **Flex 60s** mode that brings every static hold to 60 s per side for flexibility gains, vibration, a streak counter and a weekly tracker
- **Languages**: English, German, Spanish, French, Italian, Portuguese and Slovenian (Settings → Language), including spoken cues. The first launch follows the phone's language. Picks the device voice for the language, and shows a hint (with an "Install voice" button on Android) if none is installed. English and Slovenian UI strings live in `js/i18n.js` and their stretch and routine text in `js/localize.js`; each other language is one file in `js/lang/` with both
- No build step and no dependencies, just static HTML, CSS and ES modules

See [TODO.md](TODO.md) for planned ideas.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173. ES modules need an HTTP server, so opening `index.html` straight from disk won't work.

`gallery.html` is a dev page that renders every pose for checking the figures.

## Android app (Capacitor)

The Android app is built from the same web code. Capacitor wraps it in a native shell and uses native features where they work better than the browser version:
- text-to-speech for the voice;
- crisp haptics;
- keep-awake;
- edge-to-edge system bars;
- the hardware back button;
- a critter splash screen.

These live in `js/native.js` and do nothing on the web.

**Setup (once):**
1. Install Node.js LTS, JDK 21 and the Android SDK (`ANDROID_HOME`).
2. Run `npm install`.

**Common commands:**

| Command | What it does |
|---|---|
| `npm run android:debug` | Copy the web app into `www/`, sync it to `android/`, and build `android/app/build/outputs/apk/debug/app-debug.apk` |
| `npm run android:run` | Build and launch on a connected phone or emulator |
| `npm run android:open` | Open the project in Android Studio |

### Optional: cloud save with Google Play Games

The Android app can keep the player's progress (Fibbies, level, history, settings) in their own Google Play Games account through the free [Saved Games](https://developer.android.com/games/pgs/savedgames) service. It's off until the app is set up in the Play Console; until then Settings shows "Cloud save isn't set up". Separately, Android's own Auto Backup (`allowBackup`) already copies the app's data to the user's Google Drive backup and restores it on a reinstall.

To switch it on:
1. Upload the app to the Play Console (an internal testing track is enough) and add yourself as a tester.
2. In Play Console → **Play Games Services → Setup and management → Configuration**, create a games project for the app.
3. Add an **Android credential** with package `io.github.slovenec88.fibbies` and the SHA-1 of the signing key (the upload key's and the Play app signing key's; for debug builds run `cd android && ./gradlew signingReport`).
4. Under **Saved Games**, turn the feature on, then publish the Play Games configuration and add testers.
5. Copy the **project ID** (a number) into `android/gradle.properties` as `playGamesAppId=1234567890`, and rebuild.

The native side is `android/app/src/main/java/io/github/slovenec88/fibbies/PlayGamesPlugin.java`; the syncing (newest copy wins, and the app asks which to keep when two phones both have progress) is in `js/cloud.js`.

Change the web code at the repo root, then run `npm run sync`. Don't edit `www/` or `android/app/src/main/assets`; both are generated.

## Deploy

**Before every push, bump `VERSION` in `sw.js`.** The service worker serves the app cache-first, so returning users only get changes when the version changes.

Everything is static. GitHub Pages serves it straight from the `main` branch root.

## Notes

- iOS: audio and voice only start after you tap a button, which the Start button handles. With the hardware mute switch on, sound effects stay silent.
- Wake Lock needs HTTPS (or localhost) and is supported in Chrome, Edge and Safari 16.4+.
