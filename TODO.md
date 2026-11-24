# Ideas / TODO

## Restructure the other routines (planned for 2026-11-25)

The HIITs now follow what the research and popular programmes use: a few moves done in rounds, longer intervals, and the list shows each circuit once with "3 rounds". Most other routines are still long lists of many short items (for example Posture Workout: 19 items of 30–45 s). Go through every section and restructure it for:

- **Health benefit:** evidence-based doses.
  - Static stretches: about 30–60 s per muscle group (ACSM), ideally repeated, instead of many 20 s holds.
  - Strength: 2–3 sets of a few key moves, with rests, instead of one long chain.
  - Warm-ups stay dynamic.
- **Attractiveness:** fewer, longer items, grouped as rounds or sets where moves repeat (reuse the HIIT `blocks` format and the "N rounds" header in the detail list). Clear names and blurbs.
- **Ease:** obvious moves, little getting up and down from the floor, few transitions.

Then check every routine's length against its section (Quick ≤ 4 min, long ones ~15 min), update the blurbs in all 7 languages, record the voice, and run the anatomy bench and the tests.

## Native app + Garmin sync (idea, not started)

Consider shipping Fibbies as a native Android/iOS app so it can pair with a Garmin watch later.

- **Why native:** the web app can't talk to Garmin directly. Garmin integration goes through:
  - the **Connect IQ** SDK (a watch app/widget written in Monkey C), plus the Connect IQ Mobile SDK on the phone side;
  - or the **Garmin Health API** (server-side, partner programme) to read runs and activities.
- **Possible features:**
  - start a cooldown automatically when a run ends on the watch;
  - "Run Sandwich" auto-detected from real runs;
  - buzz cues on the wrist during stretches.
- **Cheapest path:** wrap the existing web app with Capacitor, so the same code becomes an Android and iOS app. Add native plugins only for the Garmin bridge, background audio and notifications. Rewrite natively only if needed.
- **Also gained:** reliable background audio and timers with the screen locked, push reminders ("keep your streak"), and app-store distribution.
- **Before starting:**
  - check the Connect IQ developer terms;
  - check app-store name availability for "Fibbies";
  - consider a trademark search.

### Research notes (2026-11-16)

- **Watch ↔ phone:** the Connect IQ Companion SDK for Android ([garmin/connectiq-android-sdk](https://github.com/garmin/connectiq-android-sdk)) relays messages through the Garmin Connect app. Forum reports flag a few things to plan for:
  - flaky messaging between some SDK versions;
  - Android killing the companion app in the background.
  So design sync to be retry-safe: queue sessions on the watch and send them when connected.
- **Runs → app:** Garmin Connect can write workouts/exercise sessions to Android **Health Connect** (user must grant the permission). The app could read finished runs from there to auto-suggest a cooldown or detect a Run Sandwich. This needs no Garmin partner approval; the Garmin Health API does need it.
- **Stretches → Garmin Connect:** a Connect IQ watch app can record a session as an activity (e.g. Yoga/flexibility), so stretches show up in the Garmin Connect history.

### Proposed sync model

- One progress store on the phone. The phone owns the rewards, so chests open on the phone.
- The watch app runs routines (timer + vibration cues) and sends a "session done" record: routine, duration, completion ratio and a unique id. The phone dedupes by id, so it doesn't matter whether a session was done on the watch or in the app.
- Phone + web or multiple phones would need an account and a small backend (separate step).

### Rough effort

| Step | Effort |
|---|---|
| Capacitor wrap of the web app (Android) | 2–4 days |
| Read runs via Health Connect | 3–5 days |
| Connect IQ watch app MVP (Monkey C) | 2–4 weeks |
| Watch ↔ phone sync | 1–2 weeks |
| iOS version (HealthKit instead of Health Connect) | +1–2 weeks |
