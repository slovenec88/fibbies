# Developing Fibbies

Fibbies is static HTML, CSS and ES modules: no build step and no bundler. The Android app wraps the same code with Capacitor.

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173. ES modules need an HTTP server, so opening `index.html` straight from disk won't work.

`gallery.html` is a dev page that renders every pose for checking the figures.

## Cloudflare web deployment

[Fibbies on the web](https://fibbies.juringari.com/) uses Workers Static Assets. Build and deploy from this repository:

```bash
npm test && npm run build:web -- --cloudflare
npx --yes --package=cf@1.0.0-rc.2 cf deploy ./www
```

Use these as the build and deploy commands in the `fibbies` Worker's Builds settings, with `main` as the production branch. The Cloudflare build gives the offline cache a version based on the Git commit. `npm run build:web` without `--cloudflare` still prepares the Android wrapper.

## Tests

```bash
npm test
```

This runs `scripts/selftest.mjs`. The test needs no dependencies. It covers the code that could lose someone's progress:
- saving;
- backup codes;
- restore.

## Where things live

| Area | Files |
|---|---|
| App shell, screens, settings | `index.html`, `styles.css`, `js/app.js` |
| Stretches, routines | `js/data.js` (research behind the Top routines: [RANKINGS.md](RANKINGS.md)) |
| Animated figures (two-bone IK) | `js/figure.js` |
| Follow-along session timer | `js/session.js` |
| Chests, multipliers, levels, quests | `js/rewards.js`, `js/reward-screen.js` |
| Procedural Fibbies, merging, evolution | `js/fibbies.js`, `js/critter.js`, `js/merge-fx.js` |
| Flexibility check | `js/flex.js` |
| Saving on the device, backup codes | `js/storage.js` |
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

See [Releasing Fibbies](docs/releasing.md) for GitHub releases, localized store screenshots, and F-Droid setup.

## Recorded voice

The voice guide plays recordings made with Azure neural text-to-speech, one gentle female voice per language. Lines without a recording use the device's own voice: the nicest one it has (`js/voice-pick.js`).

- `js/voice-lines.js` lists every line the app can say, built from the same texts the app speaks.
- `voice/voices.json` sets the Azure voice and pace for each language.
- `voice/<lang>/index.json` maps each exact text to its recording (`<hash>.ogg`, Ogg Opus).
- `js/voice-clips.js` plays them. Once the voice is used, the service worker keeps a language's recordings in a cache that outlives app updates.

Recording needs [ffmpeg](https://ffmpeg.org/) on `PATH`: each line is re-compressed to 16 kbit/s Opus, about a quarter of Azure's own size. That keeps all 7 languages at about 15 MB, about 2 MB each.

To record, put a Speech resource key in `~/.azure-speech.env`. The file lives outside the repo, and the script never prints the key:

```
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=westeurope
```

Then run:

```bash
node scripts/record-voice.mjs --audition
```

This saves one sample per candidate voice to `dist/voice-audition.html`. Pick one voice per language in `voice/voices.json`, then record:

```bash
node scripts/record-voice.mjs
```

That records all languages; to record only some, list them, e.g. `node scripts/record-voice.mjs de sl`. The free tier allows about 20 lines a minute, so a full run takes about 1.5 hours. You can stop it and run it again: it skips lines already recorded and re-records only changed lines. **After changing any spoken text (stretch names, cues, `say.*` strings), run it again** so the new lines get recorded too.

Recordings are committed to git with the app. Nothing can slip through unrecorded:
- `node scripts/check-voice.mjs` lists spoken lines with no recording.
- `npm test` fails while any line is missing.
- The commit hook in `.githooks/` prints the same list when a commit touches spoken text. It only warns, so you can commit text now and record later. Turn it on once per clone with:

```bash
git config core.hooksPath .githooks
```

## Deploy (web)

**Before every release, bump `VERSION` in `sw.js`.** The service worker serves the app cache-first, so returning users only get changes when the version changes.

Everything is static, so any static host works. GitHub Pages can serve it straight from the `main` branch root.

## Notes

- iOS: audio and voice only start after you tap a button, which the Start button handles. With the hardware mute switch on, sound effects stay silent.
- Wake Lock needs HTTPS (or localhost) and is supported in Chrome, Edge and Safari 16.4+.
- Fonts are bundled in `fonts/` with their licences (SIL Open Font License for Atkinson Hyperlegible Next, Apache 2.0 for Material Symbols).
