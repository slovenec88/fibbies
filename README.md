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
- **Languages**: English and Slovenian (Settings → Language), including spoken cues. Picks the device voice for the language, and shows a hint (with an "Install voice" button on Android) if none is installed. UI strings live in `js/i18n.js`, stretch and routine text in `js/localize.js`
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

Change the web code at the repo root, then run `npm run sync`. Don't edit `www/` or `android/app/src/main/assets`; both are generated.

## Deploy

**Before every push, bump `VERSION` in `sw.js`.** The service worker serves the app cache-first, so returning users only get changes when the version changes.

Everything is static. GitHub Pages serves it straight from the `main` branch root.

## Notes

- iOS: audio and voice only start after you tap a button, which the Start button handles. With the hardware mute switch on, sound effects stay silent.
- Wake Lock needs HTTPS (or localhost) and is supported in Chrome, Edge and Safari 16.4+.
