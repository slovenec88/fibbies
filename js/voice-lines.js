// Every line the voice guide can say in one language, built with the same texts and formulas the
// app uses when it speaks. scripts/record-voice.mjs records these; the app then plays the recording
// of any line it finds (see voice-clips.js) and uses the device voice for anything else.
import { STRETCHES } from './data.js';
import { t, setLang, getLang } from './i18n.js';
import { localizeContent } from './localize.js';
import { TIERS } from './rewards.js';

export function spokenLines(lang) {
  const before = getLang();
  setLang(lang);
  localizeContent(lang);
  const lines = new Set();
  const sides = { leg: [t('leftLeg'), t('rightLeg')], side: [t('leftSide'), t('rightSide')] };
  for (const s of Object.values(STRETCHES)) {
    // session.js moveName(): two-sided stretches are always named with their side (data.js sideLabel)
    const labels = s.limb === 'side' ? sides.side : sides.leg;
    const names = s.sided ? labels.map((side) => `${s.name}, ${side}`) : [s.name];
    for (const name of names) {
      lines.add(t('say.prep', { name }));
      lines.add(t('say.next', { name }));
    }
    for (const cue of s.cues || []) lines.add(cue);
  }
  for (const side of [...sides.leg, ...sides.side]) lines.add(t('say.switch', { side }));
  for (const line of t('hiitCheer')) lines.add(line); // session.js cheer()
  for (const k of ['say.half', 'say.done', 'say.voiceOn', 'say.newFriendAny', 'say.copyAny', 'say.levelUpAny', 'say.ranAwayAny', 'say.evolvedAny']) lines.add(t(k));
  // reward-screen.js: the chest name (English uses the short tier name)
  for (const tier of TIERS) lines.add(t('say.chest', { name: lang === 'en' ? tier.name : tier.label }));
  setLang(before);
  localizeContent(before);
  return [...lines];
}
