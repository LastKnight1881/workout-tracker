// utils.js — shared helpers. ONLY place for weight conversion.

/**
 * Format lbs value for display according to user prefs.
 * @param {number} lbs
 * @param {object} prefs  { unit_system: 'imperial'|'metric' }
 * @returns {string}
 */
export function formatWeight(lbs, prefs) {
  if (prefs?.unit_system === 'metric') return (lbs * 0.453592).toFixed(1) + ' kg';
  return lbs + ' lbs';
}

/**
 * Parse a user-entered weight string into lbs (canonical DB unit).
 * @param {string|number} input
 * @param {object} prefs
 * @returns {number} lbs
 */
export function parseWeight(input, prefs) {
  const val = parseFloat(input);
  if (isNaN(val)) return 0;
  if (prefs?.unit_system === 'metric') return val / 0.453592;
  return val;
}

/**
 * Format seconds into "1h 23m 45s" or "23:45"
 */
export function formatDuration(seconds) {
  const s = Math.floor(seconds);
  if (s < 3600) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}h ${m}m ${String(sec).padStart(2, '0')}s`;
}

/**
 * Format ISO date string to "Mon May 13"
 */
export function formatDate(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Simple pluralize: plural(3, 'set') → '3 sets'
 */
export function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** Show a brief toast notification */
export function showToast(msg, type = '') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = type ? `show ${type}` : 'show';
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.className = el.className.replace('show', '').trim(); }, 2200);
}

/** Open a bottom-sheet modal */
export function openModal(html, onClose) {
  const overlay = document.getElementById('modal-overlay');
  const modal = document.getElementById('modal');
  modal.innerHTML = html;
  overlay.style.display = 'flex';
  overlay._onClose = onClose;
  overlay.onclick = (e) => {
    if (e.target === overlay) closeModal();
  };
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'none';
  if (typeof overlay._onClose === 'function') overlay._onClose();
  overlay._onClose = null;
}
