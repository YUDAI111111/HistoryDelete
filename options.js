const DEFAULT_KEY = 'all';
function setChecked(name, value) { document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.checked = (r.value === value)); }
function showHideRows(mode) {
  document.getElementById('intervalRow').style.display = (mode === 'interval') ? 'grid' : 'none';
  document.getElementById('dailyRow').style.display = (mode === 'daily') ? 'grid' : 'none';
}
async function load() {
  const { periodKey, theme, auto } = await chrome.storage.sync.get({
    periodKey: DEFAULT_KEY, theme: 'light',
    auto: { enabled: false, startup:false, onClose:false, onLock:false, mode: 'none', intervalMin: 60, dailyTime: '03:00' }
  });
  setChecked('period', periodKey);
  setChecked('theme', theme);
  document.getElementById('autoEnabled').checked = !!auto.enabled;
  document.getElementById('autoStartup').checked = !!auto.startup;
  document.getElementById('autoOnClose').checked = !!auto.onClose;
  document.getElementById('autoOnLock').checked = !!auto.onLock;
  document.getElementById('autoMode').value = auto.mode || 'none';
  document.getElementById('intervalMin').value = auto.intervalMin || 60;
  document.getElementById('dailyTime').value = auto.dailyTime || '03:00';
  showHideRows(auto.mode);
}
async function savePeriod(e) {
  e.preventDefault();
  const sel = document.querySelector('input[name="period"]:checked');
  await chrome.storage.sync.set({ periodKey: sel?.value || DEFAULT_KEY });
  const s = document.getElementById('periodStatus'); s.textContent = '保存しました'; setTimeout(()=>s.textContent='',1500);
  chrome.runtime.sendMessage({ type: 'refreshBadge' });
}
async function saveTheme(e) {
  e.preventDefault();
  const sel = document.querySelector('input[name="theme"]:checked');
  await chrome.storage.sync.set({ theme: sel?.value || 'light' });
  const s = document.getElementById('themeStatus'); s.textContent = '保存しました'; setTimeout(()=>s.textContent='',1500);
}
async function saveAuto(e) {
  e.preventDefault();
  const enabled = document.getElementById('autoEnabled').checked;
  const startup = document.getElementById('autoStartup').checked;
  const onClose = document.getElementById('autoOnClose').checked;
  const onLock = document.getElementById('autoOnLock').checked;
  const mode = document.getElementById('autoMode').value;
  const intervalMin = Math.max(5, parseInt(document.getElementById('intervalMin').value || '60', 10));
  const dailyTime = document.getElementById('dailyTime').value || '03:00';
  await chrome.storage.sync.set({ auto: { enabled, startup, onClose, onLock, mode, intervalMin, dailyTime } });
  const s = document.getElementById('autoStatus'); s.textContent = '保存しました'; setTimeout(()=>s.textContent='',1500);
  chrome.runtime.sendMessage({ type: 'reconfigureAlarms' });
}
document.addEventListener('DOMContentLoaded', () => {
  load();
  document.getElementById('periodForm')?.addEventListener('submit', savePeriod);
  document.getElementById('themeForm')?.addEventListener('submit', saveTheme);
  document.getElementById('autoForm')?.addEventListener('submit', saveAuto);
  document.getElementById('autoMode')?.addEventListener('change', (e)=>showHideRows(e.target.value));
});
