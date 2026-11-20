// Keeps the screen on during a session. Re-acquires after tab visibility changes.
// In the native app the KeepAwake plugin does this instead of the Screen Wake Lock API.
import { native } from './native.js';
let nativeOn = false;
let sentinel = null;
let pending = null;
let wanted = false;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(!!sentinel || nativeOn);
}

function acquire() {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return Promise.resolve();
  if (sentinel || pending) return pending || Promise.resolve();
  pending = navigator.wakeLock.request('screen')
    .then((s) => {
      pending = null;
      if (!wanted) { s.release().catch(() => {}); return; }
      sentinel = s;
      s.addEventListener('release', () => {
        if (sentinel === s) { sentinel = null; emit(); }
      });
      emit();
    })
    .catch(() => { pending = null; emit(); });
  return pending;
}

document.addEventListener('visibilitychange', () => {
  if (wanted && document.visibilityState === 'visible' && !sentinel) acquire();
});

export const wakeLock = {
  on() {
    wanted = true;
    if (native.keepAwake(true)) { nativeOn = true; emit(); return Promise.resolve(); }
    return acquire();
  },
  async off() {
    wanted = false;
    if (nativeOn) { native.keepAwake(false); nativeOn = false; emit(); return; }
    // a still-pending web request releases itself when it resolves
    const s = sentinel;
    sentinel = null;
    try { await s?.release(); } catch { /* ignore */ }
    emit();
  },
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
