const PERIOD_KEYS = { ALL_TIME: 'all', HOUR: '1h', DAY: '24h', WEEK: '7d', MONTH: '30d' };
const ALARM_NAME = 'autoClear';
let lastClearTs = 0;
function debounceClear() {
  const now = Date.now();
  if (now - lastClearTs < 3000) return true;
  lastClearTs = now;
  return false;
}
function calcSinceTs(key) {
  const now = Date.now();
  switch (key) {
    case PERIOD_KEYS.HOUR:  return now - 60 * 60 * 1000;
    case PERIOD_KEYS.DAY:   return now - 24 * 60 * 60 * 1000;
    case PERIOD_KEYS.WEEK:  return now - 7 * 24 * 60 * 60 * 1000;
    case PERIOD_KEYS.MONTH: return now - 30 * 24 * 60 * 1000 * 60;
    case PERIOD_KEYS.ALL_TIME: default: return 0;
  }
}
async function getConf() {
  const def = { periodKey: PERIOD_KEYS.ALL_TIME,
    auto: { enabled:false, startup:false, onClose:false, onLock:false, mode:'none', intervalMin:60, dailyTime:'03:00' } };
  const { periodKey, auto } = await chrome.storage.sync.get(def);
  return { periodKey, auto: Object.assign(def.auto, auto || {}) };
}
async function clearHistoryAndBadge() {
  if (debounceClear()) return;
  const { periodKey } = await getConf();
  const since = calcSinceTs(periodKey);
  try { await chrome.browsingData.remove({ since }, { history: true }); } catch (e) {}
  await updateBadge();
}
async function countHistory() {
  const { periodKey } = await getConf();
  const startTime = calcSinceTs(periodKey);
  const MAX = 1000;
  return new Promise((resolve)=>{
    chrome.history.search({ text:'', startTime, maxResults: MAX }, (results)=>{
      if (chrome.runtime.lastError) { resolve(0); return; }
      resolve(Math.min(results.length, MAX));
    });
  });
}
async function updateBadge() {
  const n = await countHistory();
  let text = '';
  if (n === 0) text = '';
  else if (n >= 100) text = '99+';
  else text = String(n);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
}
async function cancelAlarms() { try { await chrome.alarms.clear(ALARM_NAME); } catch (e) {} }
function parseDailyTime(str) {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(str||'');
  return !m ? { hours:3, minutes:0 } : { hours:parseInt(m[1],10), minutes:parseInt(m[2],10) };
}
async function scheduleAlarms() {
  await cancelAlarms();
  const { auto } = await getConf();
  if (!auto.enabled) return;
  if (auto.mode === 'interval') {
    const min = Math.max(5, Number(auto.intervalMin||60));
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: min, when: Date.now() + 1000 });
  } else if (auto.mode === 'daily') {
    const { hours, minutes } = parseDailyTime(auto.dailyTime);
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    if (first.getTime() <= now.getTime()) first.setDate(first.getDate() + 1);
    await chrome.alarms.create(ALARM_NAME, { when: first.getTime(), periodInMinutes: 1440 });
  }
}
chrome.runtime.onInstalled.addListener(async () => { await updateBadge(); await scheduleAlarms(); });
chrome.runtime.onStartup.addListener(async () => {
  const { auto } = await getConf();
  await updateBadge();
  if (auto.enabled && auto.startup) await clearHistoryAndBadge();
});
chrome.alarms.onAlarm.addListener(async (a)=>{ if (a && a.name === ALARM_NAME) await clearHistoryAndBadge(); });
chrome.history.onVisited.addListener(updateBadge);
chrome.history.onVisitRemoved.addListener(updateBadge);
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.auto) await scheduleAlarms();
  if (area === 'sync' && changes.periodKey) updateBadge();
});
chrome.windows.onRemoved.addListener(async () => {
  const { auto } = await getConf();
  if (!(auto.enabled && auto.onClose)) return;
  setTimeout(async () => {
    try {
      const wins = await chrome.windows.getAll({ populate: false });
      if (!wins || wins.length === 0) await clearHistoryAndBadge();
    } catch (e) {}
  }, 500);
});
chrome.idle.setDetectionInterval(15);
chrome.idle.onStateChanged.addListener(async (state) => {
  if (state !== 'locked') return;
  const { auto } = await getConf();
  if (auto.enabled && auto.onLock) await clearHistoryAndBadge();
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'refreshBadge') updateBadge();
  if (msg?.type === 'reconfigureAlarms') scheduleAlarms();
});
