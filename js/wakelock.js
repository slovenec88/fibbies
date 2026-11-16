// Keeps the screen on during a session. Re-acquires after tab visibility changes.
let sentinel = null;
let pending = null;
let wanted = false;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn(!!sentinel);
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
  supported: 'wakeLock' in navigator,
  on() {
    wanted = true;
    return acquire();
  },
  async off() {
    wanted = false; // a still-pending request releases itself when it resolves
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
