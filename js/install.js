import { isNative } from './native.js';

export function setupInstallPrompt() {
  const standalone = matchMedia('(display-mode: standalone)');
  if (isNative || navigator.standalone || standalone.matches) return;

  const card = document.getElementById('install-app');
  const button = document.getElementById('install-fibbies');
  const settings = document.getElementById('install-settings');
  const settingsButton = document.getElementById('set-install');
  const help = document.getElementById('install-help');
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const androidMobile = /Android/.test(navigator.userAgent);
  document.getElementById('install-help-apple').hidden = !appleMobile;
  document.getElementById('install-help-android').hidden = appleMobile || !androidMobile;
  let offer = null;
  let installed = false;

  const refresh = () => {
    const available = !installed && !standalone.matches;
    card.hidden = !available || !offer;
    settingsButton.hidden = card.hidden;
    help.hidden = !available || !!offer || !(appleMobile || androidMobile);
    settings.hidden = settingsButton.hidden && help.hidden;
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

  const install = async () => {
    if (!offer) return;
    const prompt = offer;
    offer = null;
    button.disabled = settingsButton.disabled = true;
    try {
      await prompt.prompt();
      installed = (await prompt.userChoice).outcome === 'accepted';
    } catch { /* The browser can revoke an offer before it is used. */ }
    finally {
      button.disabled = settingsButton.disabled = false;
      refresh();
    }
  };
  button.addEventListener('click', install);
  settingsButton.addEventListener('click', install);
  refresh();
}
