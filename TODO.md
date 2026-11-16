# Ideas / TODO

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
