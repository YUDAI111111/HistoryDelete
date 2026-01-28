export async function applyTheme() {
  const { theme } = await chrome.storage.sync.get({ theme: 'light' });
  document.documentElement.setAttribute('data-theme', theme);
}
export async function initThemeToggle(selector) {
  const { theme } = await chrome.storage.sync.get({ theme: 'light' });
  document.querySelectorAll(selector).forEach(r => r.checked = (r.value === theme));
}
