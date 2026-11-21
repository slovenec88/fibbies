import { isNative } from './native.js';

export function setupInstallPrompt() {
  const standalone = matchMedia('(display-mode: standalone)');
  if (isNative || navigator.standalone || standalone.matches) return;

  const card = document.getElementById('install-app');
  const button = document.getElementById('install-fibbies');
  const settings = document.getElementById('install-settings');
  const settingsButton = document.getElementById('set-install');
  const help = document.getElementById('install-help');
  const homeHelp = document.getElementById('install-help-home');
  const appleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const androidMobile = /Android/.test(navigator.userAgent);
  const firefox = /Firefox\/(\d+)/.exec(navigator.userAgent);
  const firefoxWindows = firefox && Number(firefox[1]) >= 143 && /Windows/.test(navigator.userAgent);
  const firefoxHelp = !!firefox && (androidMobile || firefoxWindows);
  document.getElementById('install-help-apple').hidden = !appleMobile;
  document.getElementById('install-help-android').hidden = appleMobile || !androidMobile;
  if (firefoxHelp) homeHelp.dataset.i18n = firefoxWindows ? 'installHelpWindows' : 'installHelpAndroid';
  let offer = null;
  let installed = false;

  const refresh = () => {
    const available = !installed && !standalone.matches;
    card.hidden = !available || !(offer || firefoxHelp);
    settingsButton.hidden = !available || !offer || firefoxHelp;
    help.hidden = !available || !!offer || firefoxHelp || !(appleMobile || androidMobile);
    if (!available || offer) homeHelp.hidden = true;
    if (available && firefoxHelp && !offer) {
      button.setAttribute('aria-controls', homeHelp.id);
      button.setAttribute('aria-expanded', String(!homeHelp.hidden));
    } else {
      button.removeAttribute('aria-controls');
      button.removeAttribute('aria-expanded');
    }
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
    if (!offer) {
      if (firefoxHelp) {
        homeHelp.hidden = !homeHelp.hidden;
        refresh();
      }
      return;
    }
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
