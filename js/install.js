import { isNative } from './native.js';
import { readJSON, writeJSON } from './storage.js';

const DISMISSED = 'fibbies.install-dismissed';

export function setupInstallPrompt() {
  const standalone = matchMedia('(display-mode: standalone)');
  if (isNative || navigator.standalone || standalone.matches || readJSON(DISMISSED, false)) return;

  const card = document.getElementById('install-app');
  const languageHint = document.getElementById('lang-hint');
  const button = document.getElementById('install-fibbies');
  const help = document.getElementById('install-help');
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let offer = null;
  let installed = false;
  let dismissed = false;

  const refresh = () => {
    card.hidden = !languageHint.hidden || installed || standalone.matches || dismissed || !(offer || appleMobile);
    if (appleMobile && !offer) {
      button.setAttribute('aria-controls', help.id);
      button.setAttribute('aria-expanded', String(!help.hidden));
    } else {
      button.removeAttribute('aria-controls');
      button.removeAttribute('aria-expanded');
      help.hidden = true;
    }
  };
  const dismiss = () => {
    dismissed = true;
    writeJSON(DISMISSED, true);
    refresh();
  };

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    offer = event;
    refresh();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    refresh();
  });
  standalone.addEventListener('change', refresh);
  new MutationObserver(refresh).observe(languageHint, { attributes: true, attributeFilter: ['hidden'] });
  document.getElementById('install-dismiss').addEventListener('click', dismiss);
  button.addEventListener('click', async () => {
    if (!offer) {
      help.hidden = !help.hidden;
      refresh();
      return;
    }
    const prompt = offer;
    offer = null;
    refresh();
    try {
      await prompt.prompt();
      if ((await prompt.userChoice).outcome === 'dismissed') dismiss();
    } catch { /* The browser can revoke an install offer before it is used. */ }
  });
  refresh();
}
