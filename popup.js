const PERIOD_KEYS = { ALL_TIME: 'all', HOUR: '1h', DAY: '24h', WEEK: '7d', MONTH: '30d' };
const CLOSE_DELAY_MS = 1200;

function calcSinceTs(key) {
  const now = Date.now();
  switch (key) {
    case PERIOD_KEYS.HOUR:  return now - 60 * 60 * 1000;
    case PERIOD_KEYS.DAY:   return now - 24 * 60 * 60 * 1000;
    case PERIOD_KEYS.WEEK:  return now - 7 * 24 * 60 * 60 * 1000;
    case PERIOD_KEYS.MONTH: return now - 30 * 24 * 60 * 60 * 1000;
    case PERIOD_KEYS.ALL_TIME:
    default: return 0;
  }
}
async function getPeriodKey() {
  const { periodKey } = await chrome.storage.sync.get({ periodKey: PERIOD_KEYS.ALL_TIME });
  return periodKey;
}
async function clearHistory() {
  const key = await getPeriodKey();
  const since = calcSinceTs(key);
  await chrome.browsingData.remove({ since }, { history: true });
  chrome.runtime.sendMessage({ type: 'refreshBadge' });
}
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('clearBtn');
  btn?.addEventListener('click', async () => {
    btn.disabled = true;
    try { await clearHistory(); btn.classList.add('done'); }
    catch (e) { console.error('history clear failed:', e); }
    finally { setTimeout(() => window.close(), CLOSE_DELAY_MS); }
  });
});
