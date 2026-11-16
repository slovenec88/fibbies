# Limber: stretches for runners

A phone-first web app with follow-along stretching routines for runners. Every routine runs 5–10 minutes and comes with voice guidance, sound cues, an on-screen timer and animated figures that show each pose. The screen stays awake while you stretch.

## Features

- **12 routines in 4 groups** (After run, Before run, Evening, Quick), each led by a research-ranked **Top 5** routine
- **Top 10 rankings** for each group, ranked by effectiveness versus simplicity (see [RANKINGS.md](RANKINGS.md))
- **32 stretches**, each with an animated figure drawn from joint targets (two-bone IK)
- **Audio**: synthesized chimes, a 3-2-1 countdown, halfway and switch-sides cues, plus spoken names and tips through the Web Speech API
- **Screen Wake Lock**, so the phone doesn't go to sleep mid-stretch
- **Material You styling**: a tonal palette built from a seed hue in OKLCH, light and dark themes, and 8 color choices
- **Installable PWA** that works offline after the first visit
- Hold length setting (shorter / standard / longer), vibration, a streak counter and a weekly tracker
- No build step and no dependencies, just static HTML, CSS and ES modules

## Run locally

```bash
python -m http.server 5173
```

Then open http://localhost:5173. ES modules need an HTTP server, so opening `index.html` straight from disk won't work.

`gallery.html` is a dev page that renders every pose for checking the figures.

## Deploy

Everything is static. GitHub Pages serves it straight from the `main` branch root.

## Notes

- iOS: audio and voice only start after you tap a button, which the Start button handles. With the hardware mute switch on, sound effects stay silent.
- Wake Lock needs HTTPS (or localhost) and is supported in Chrome, Edge and Safari 16.4+.
