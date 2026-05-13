// app.js — SPA router + global state

import { getPreferences, getSession } from './api.js';
import { showToast } from './utils.js';

// ─── Global state ─────────────────────────────────────────────────────────────
let _state = {
  prefs: { unit_system: 'imperial', rest_timer_sec: 90 },
  activeSession: null, // { session_id, started_at, day_id, routine_id }
};

export function getState() { return _state; }
export function setState(partial) {
  _state = { ..._state, ...partial };
}

// ─── Page registry ────────────────────────────────────────────────────────────
const pages = {};
const pageModules = {
  home:      () => import('./pages/home.js'),
  session:   () => import('./pages/session.js'),
  routines:  () => import('./pages/routines.js'),
  exercises: () => import('./pages/exercises.js'),
  history:   () => import('./pages/history.js'),
  settings:  () => import('./pages/settings.js'),
};

// ─── Router ──────────────────────────────────────────────────────────────────
let currentPage = null;
let currentCleanup = null;

async function navigate() {
  const hash = window.location.hash.replace('#', '') || 'home';
  const [page] = hash.split('?');
  const target = pageModules[page] ? page : 'home';

  // nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === target);
  });

  // cleanup previous page
  if (typeof currentCleanup === 'function') {
    currentCleanup();
    currentCleanup = null;
  }

  const container = document.getElementById('app');
  container.innerHTML = '<div class="spinner"></div>';

  try {
    let mod = pages[target];
    if (!mod) {
      mod = await pageModules[target]();
      pages[target] = mod;
    }
    currentPage = target;
    currentCleanup = await mod.init(container, _state) || null;
  } catch (err) {
    console.error('Page load error:', err);
    container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${err.message}</p></div>`;
  }
}

// ─── Startup ──────────────────────────────────────────────────────────────────
async function boot() {
  // Load preferences
  try {
    const prefs = await getPreferences();
    _state.prefs = prefs;
  } catch (e) {
    console.warn('Failed to load prefs, using defaults', e);
  }

  // Check for persisted active session
  const savedSession = sessionStorage.getItem('activeSession');
  if (savedSession) {
    try {
      const parsed = JSON.parse(savedSession);
      // Verify it's still live
      const sess = await getSession(parsed.session_id);
      if (!sess.finished_at) {
        _state.activeSession = parsed;
      } else {
        sessionStorage.removeItem('activeSession');
      }
    } catch {
      sessionStorage.removeItem('activeSession');
    }
  }

  window.addEventListener('hashchange', navigate);
  navigate();
}

// ─── Active session helpers (used by session page) ───────────────────────────
export function setActiveSession(sess) {
  _state.activeSession = sess;
  if (sess) {
    sessionStorage.setItem('activeSession', JSON.stringify(sess));
  } else {
    sessionStorage.removeItem('activeSession');
  }
}

export function getActiveSession() { return _state.activeSession; }

// ─── Expose showToast globally for convenience ────────────────────────────────
window.showToast = showToast;

document.addEventListener('DOMContentLoaded', boot);
