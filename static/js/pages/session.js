// pages/session.js — Active Session (most complex page)

import {
  getActiveRoutine, getRoutine, startSession, getSession, getSessionPlan,
  logSet, finishSession, cancelSession, getLastSets
} from '../api.js';
import { formatWeight, parseWeight, formatDuration, showToast, openModal, closeModal } from '../utils.js';
import { RestTimer, playDoneBeeps } from '../services/timer.js';
import { setActiveSession, getActiveSession, setState } from '../app.js';

let _elapsedTimer = null;
let _restTimer = null;
let _sessionId = null;
let _startedAt = null;       // set when Begin is clicked, not when session created
let _prefs = null;
let _paused = false;
let _pausedAt = null;
let _pausedElapsed = 0;
let _pendingSession = null;  // session created but Begin not yet clicked: { id, plan }

export async function init(container, state) {
  _prefs = state.prefs;
  cleanup();

  const hash = window.location.hash.replace('#', '');
  const params = parseHashParams(hash);

  // Active session = Begin was already clicked — resume mid-workout
  const active = getActiveSession();
  if (active) {
    await resumeSession(container, active);
    return cleanup;
  }

  // Pending session = day was picked but Begin not yet clicked — restore Ready screen
  if (_pendingSession) {
    renderReadyScreen(container, _pendingSession.plan);
    return cleanup;
  }

  const dayId = params.day ? parseInt(params.day) : null;
  const routineId = params.routine ? parseInt(params.routine) : null;

  if (dayId && routineId) {
    await startAndRender(container, dayId, routineId);
  } else {
    await renderDayPicker(container);
  }

  return cleanup;
}

function cleanup() {
  if (_elapsedTimer) { clearInterval(_elapsedTimer); _elapsedTimer = null; }
  if (_restTimer) { _restTimer.destroy(); _restTimer = null; }
  hideRestTimer();
  _paused = false;
  _pausedAt = null;
  _pausedElapsed = 0;
  _pendingSession = null;
  window._sessionActive = false;
}

// ─── Day Picker ───────────────────────────────────────────────────────────────
async function renderDayPicker(container) {
  container.innerHTML = '<div class="spinner"></div>';
  let routine;
  try {
    routine = await getActiveRoutine();
  } catch {
    container.innerHTML = `
      <div class="empty-state">
        <h2>No active routine</h2>
        <p>Set a routine as active first.</p>
        <a href="#routines" class="btn btn-primary">Go to Routines</a>
      </div>`;
    return;
  }

  const days = routine.days || [];
  container.innerHTML = `
    <div class="page-title">Start Workout</div>
    <div class="section-title">Select Day</div>
    <div class="day-picker">
      ${days.map(d => `
        <div class="day-card" data-day="${d.id}" data-routine="${routine.id}">
          <div class="day-card-name">Day ${d.day_number}: ${esc(d.name)}</div>
          <div class="day-card-exercises">${(d.exercises || []).length} exercises</div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.day-card').forEach(card => {
    card.addEventListener('click', () => {
      const dayId = parseInt(card.dataset.day);
      const routineId = parseInt(card.dataset.routine);
      startAndRender(container, dayId, routineId);
    });
  });
}

// ─── Start + Render Session ────────────────────────────────────────────────────
async function startAndRender(container, dayId, routineId) {
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const sess = await startSession(dayId, routineId);
    _sessionId = sess.id;
    _startedAt = null;  // not started until Begin is clicked
    const plan = await getSessionPlan(sess.id);
    // Store as pending — do NOT call setActiveSession yet
    _pendingSession = { id: sess.id, plan };
    renderReadyScreen(container, plan);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
    showToast(e.message, 'error');
  }
}

function renderReadyScreen(container, plan) {
  const exCount = (plan.exercises || []).length;
  container.innerHTML = `
    <div class="ready-screen">
      <div class="ready-day-name">Day ${plan.day_number || ''}: ${esc(plan.day_name || '')}</div>
      <div class="ready-meta">${exCount} exercise${exCount !== 1 ? 's' : ''}</div>
      <button class="btn btn-primary btn-lg" id="begin-btn">▶ Begin Workout</button>
      <button class="btn btn-ghost btn-sm" id="cancel-ready-btn">✕ Cancel</button>
    </div>
  `;
  container.querySelector('#begin-btn').addEventListener('click', async () => {
    _startedAt = new Date();
    _pausedElapsed = 0;
    _pendingSession = null;
    // NOW mark session as active so resume works if user navigates away mid-workout
    setActiveSession({
      session_id: _sessionId,
      started_at: _startedAt.toISOString(),
      day_id: plan.day_id,
    });
    await renderActiveSession(container, plan);
  });
  container.querySelector('#cancel-ready-btn').addEventListener('click', () => cancelWorkout(container, plan.session_id, true));
}

async function resumeSession(container, active) {
  container.innerHTML = '<div class="spinner"></div>';
  try {
    _sessionId = active.session_id;
    // started_at is the Begin-click time stored in setActiveSession
    _startedAt = new Date(active.started_at);
    _pausedElapsed = active.paused_elapsed_ms || 0;
    const plan = await getSessionPlan(active.session_id);
    if (plan.finished_at) {
      setActiveSession(null);
      window.location.hash = '#history';
      return;
    }
    await renderActiveSession(container, plan);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

// ─── Cancel Workout ───────────────────────────────────────────────────────────
async function cancelWorkout(container, sessionId, silent) {
  const msg = silent
    ? 'Cancel this workout? No sets have been logged yet.'
    : 'Cancel workout? All logged sets will be deleted and this session will be removed.';
  if (!confirm(msg)) return;
  try {
    await cancelSession(sessionId);
  } catch (e) {
    // If already gone, ignore
  }
  cleanup();
  setActiveSession(null);
  _sessionId = null;
  showToast('Workout cancelled', 'info');
  await renderDayPicker(container);
}

// ─── Active Session Render ────────────────────────────────────────────────────
async function renderActiveSession(container, plan) {
  const exercises = plan.exercises || [];
  // Fetch last sets for each exercise in parallel
  const lastSetsMap = {};
  await Promise.all(exercises.map(async ex => {
    try {
      lastSetsMap[ex.exercise_id] = await getLastSets(ex.exercise_id);
    } catch { lastSetsMap[ex.exercise_id] = []; }
  }));

  container.innerHTML = `
    <div class="session-header">
      <div class="session-elapsed" id="session-elapsed">0:00</div>
      <div class="session-day-name">Day ${plan.day_number || ''}: ${esc(plan.day_name || '')}</div>
      <button class="btn btn-ghost btn-sm" id="pause-btn">⏸ Pause</button>
    </div>
    <div id="paused-overlay" style="display:none" class="paused-overlay">
      <div class="paused-label">⏸ Paused</div>
      <button class="btn btn-primary" id="resume-btn">▶ Resume</button>
    </div>
    <div id="exercise-cards">
      ${exercises.map(ex => renderExerciseCard(ex, lastSetsMap[ex.exercise_id] || [], plan.session_id)).join('')}
    </div>
    <div class="finish-bar">
      <button class="btn btn-danger btn-block" id="finish-btn">Finish Workout</button>
      <button class="btn btn-cancel btn-block" id="cancel-active-btn">✕ Cancel Workout</button>
    </div>
  `;

  // Elapsed timer
  startElapsedTimer();

  // Wire up exercise cards
  wireExerciseCards(container, plan.session_id);

  // Pause / Resume
  container.querySelector('#pause-btn').addEventListener('click', () => pauseWorkout(container));
  container.querySelector('#resume-btn').addEventListener('click', () => resumeWorkout(container));

  // Finish button
  container.querySelector('#finish-btn').addEventListener('click', () => showFinishModal(plan.session_id));

  // Cancel button
  container.querySelector('#cancel-active-btn').addEventListener('click', () => cancelWorkout(container, plan.session_id, false));

  // Warn on navigate away
  window._sessionActive = true;
}

function startElapsedTimer() {
  if (_elapsedTimer) clearInterval(_elapsedTimer);
  _elapsedTimer = setInterval(() => {
    if (_paused || !_startedAt) return;
    const el = document.getElementById('session-elapsed');
    if (el) {
      const secs = Math.floor((_pausedElapsed + Date.now() - _startedAt.getTime()) / 1000);
      el.textContent = formatDuration(Math.max(0, secs));
    }
  }, 1000);
}

function pauseWorkout(container) {
  if (_paused) return;
  _paused = true;
  // Accumulate elapsed up to this moment
  if (_startedAt) {
    _pausedElapsed += Date.now() - _startedAt.getTime();
    _startedAt = null;
  }
  if (_restTimer) { _restTimer.destroy(); _restTimer = null; }
  // Persist paused_elapsed_ms so resume-after-nav works
  const active = getActiveSession();
  if (active) setActiveSession({ ...active, paused_elapsed_ms: _pausedElapsed });
  const overlay = document.getElementById('paused-overlay');
  if (overlay) overlay.style.display = 'flex';
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) pauseBtn.style.display = 'none';
}

function resumeWorkout(container) {
  if (!_paused) return;
  _paused = false;
  _startedAt = new Date();
  // Update stored started_at so resume-after-nav recalculates correctly
  const active = getActiveSession();
  if (active) setActiveSession({ ...active, started_at: _startedAt.toISOString(), paused_elapsed_ms: _pausedElapsed });
  const overlay = document.getElementById('paused-overlay');
  if (overlay) overlay.style.display = 'none';
  const pauseBtn = document.getElementById('pause-btn');
  if (pauseBtn) pauseBtn.style.display = '';
}

function renderExerciseCard(ex, lastSets, sessionId) {
  const setCount = ex.set_count || 3;
  const targetReps = parseTargetReps(ex.target_reps, setCount);
  const loggedBySetNum = {};
  (ex.logged_sets || []).forEach(s => { loggedBySetNum[s.set_number] = s; });

  const rows = [];
  for (let i = 0; i < setCount; i++) {
    const setNum = i + 1;
    const logged = loggedBySetNum[setNum];
    const last = lastSets[i];
    // Priority: already logged this session > last session > plan default
    const prefillWeight = logged ? logged.weight_lbs : (last ? last.weight : (ex.target_weight_lbs || ''));
    const prefillReps = logged ? logged.reps : (last ? last.reps : (targetReps[i] || ''));
    const isLogged = !!logged;
    const isPR = logged?.is_pr;
    rows.push(renderSetRow(setNum, prefillWeight, prefillReps, targetReps[i] || '', false, isLogged, isPR));
  }
  return `
    <div class="exercise-card" data-exercise-id="${ex.exercise_id}" data-session-id="${sessionId}">
      <div class="exercise-card-header">
        <span class="exercise-name">${esc(ex.exercise_name || ex.name || '')}</span>
        <span class="muscle-badge">${esc(ex.muscle_group || '')}</span>
        <button class="btn btn-icon swap-icon-btn" title="Swap exercise">⇄</button>
      </div>
      <div class="exercise-card-body">
        <div class="set-list">${rows.join('')}</div>
        <div class="add-set-row">
          <button class="btn btn-ghost btn-sm add-set-btn">+ Add Set</button>
        </div>
      </div>
    </div>
  `;
}

function renderSetRow(setNum, weight, reps, targetRep, warmup = false, logged = false, isPR = false) {
  const weightUnit = _prefs?.unit_system === 'metric' && weight
    ? (parseFloat(weight) * 0.453592).toFixed(1)
    : (weight || '');
  return `
    <div class="target-label">${targetRep ? `Target: ${targetRep} reps` : ''}${isPR ? ' 🏆 PR' : ''}</div>
    <div class="set-row${warmup ? ' warmup' : ''}${logged ? ' logged' : ''}" data-set-num="${setNum}">
      <span class="set-num">${setNum}</span>
      <input class="set-input weight-input" type="number" step="0.5" placeholder="lbs" value="${weightUnit}" min="0">
      <input class="set-input set-input-reps reps-input" type="number" placeholder="reps" value="${reps || ''}" min="0">
      <button class="btn btn-ghost set-log-btn btn-sm${logged ? ' logged' : ''}">${logged ? '✓' : 'Log'}</button>
      <button class="btn btn-ghost set-warmup-btn btn-sm${warmup ? ' active' : ''}" title="Toggle warmup">W</button>
    </div>
  `;
}

function parseTargetReps(str, setCount) {
  if (!str) return Array(setCount).fill('');
  const parts = String(str).split(',').map(s => s.trim());
  // Extend or trim to setCount
  while (parts.length < setCount) parts.push(parts[parts.length - 1] || '');
  return parts.slice(0, setCount);
}

function wireExerciseCards(container, sessionId) {
  container.querySelectorAll('.exercise-card').forEach(card => {
    const exerciseId = parseInt(card.dataset.exerciseId);

    // Log buttons
    card.querySelectorAll('.set-row').forEach(row => {
      wireSetRow(row, sessionId, exerciseId, card);
    });

    // Add set button
    card.querySelector('.add-set-btn').addEventListener('click', () => {
      const list = card.querySelector('.set-list');
      const rows = list.querySelectorAll('.set-row');
      const lastRow = rows[rows.length - 1];
      const setNum = rows.length + 1;
      const lastWeight = lastRow?.querySelector('.weight-input')?.value || '';
      const lastReps = lastRow?.querySelector('.reps-input')?.value || '';
      const newRowHtml = `
        <div class="target-label"></div>
        <div class="set-row" data-set-num="${setNum}">
          <span class="set-num">${setNum}</span>
          <input class="set-input weight-input" type="number" step="0.5" placeholder="lbs" value="${lastWeight}" min="0">
          <input class="set-input set-input-reps reps-input" type="number" placeholder="reps" value="${lastReps}" min="0">
          <button class="btn btn-ghost set-log-btn btn-sm">Log</button>
          <button class="btn btn-ghost set-warmup-btn btn-sm" title="Toggle warmup">W</button>
        </div>
      `;
      list.insertAdjacentHTML('beforeend', newRowHtml);
      const newRow = list.querySelector(`.set-row[data-set-num="${setNum}"]`);
      wireSetRow(newRow, sessionId, exerciseId, card);
    });

    // Warmup toggles (delegated)
    card.addEventListener('click', e => {
      if (e.target.classList.contains('set-warmup-btn')) {
        e.target.classList.toggle('active');
      }
    });

    // Swap button
    card.querySelector('.swap-icon-btn')?.addEventListener('click', () => {
      showToast('Swap: tap exercise in library page', '');
    });
  });
}

function wireSetRow(row, sessionId, exerciseId, card) {
  const logBtn = row.querySelector('.set-log-btn');
  if (!logBtn) return;
  logBtn.addEventListener('click', async () => {
    const weightInput = row.querySelector('.weight-input');
    const repsInput = row.querySelector('.reps-input');
    const warmupBtn = row.querySelector('.set-warmup-btn');
    const isWarmup = warmupBtn?.classList.contains('active') || false;
    const setNum = parseInt(row.dataset.setNum);
    const weightLbs = parseWeight(weightInput.value, _prefs);
    const reps = parseInt(repsInput.value);
    if (isNaN(weightLbs) || isNaN(reps) || reps <= 0) {
      showToast('Enter valid weight and reps', 'error');
      return;
    }
    logBtn.disabled = true;
    try {
      const result = await logSet(sessionId, {
        exercise_id: exerciseId,
        set_number: setNum,
        weight: weightLbs,
        reps,
        is_warmup: isWarmup ? 1 : 0,
      });
      row.classList.add('logged');
      logBtn.textContent = '✓';
      logBtn.classList.add('btn-success');
      logBtn.classList.remove('btn-ghost');
      if (result?.is_pr) {
        row.insertAdjacentHTML('beforeend', '<span class="pr-badge">🏆 PR!</span>');
      }
      // Start rest timer
      startRestTimer(_prefs?.rest_timer_sec || 90);
    } catch (e) {
      logBtn.disabled = false;
      showToast(e.message, 'error');
    }
  });
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function startRestTimer(durationSec) {
  if (_restTimer) { _restTimer.destroy(); }
  const bar = document.getElementById('rest-timer-bar');
  const display = document.getElementById('rest-timer-display');
  bar.style.display = 'block';
  bar.classList.add('active');
  bar.classList.remove('done');

  _restTimer = new RestTimer(
    durationSec,
    (remaining) => {
      if (display) {
        const m = Math.floor(remaining / 60);
        const s = remaining % 60;
        display.textContent = `${m}:${String(s).padStart(2, '0')}`;
      }
    },
    () => {
      bar.classList.add('done');
      playDoneBeeps();
      if (display) display.textContent = '0:00';
    }
  );
  _restTimer.start();

  document.getElementById('rest-timer-minus').onclick = () => {
    _restTimer.addSeconds(-15);
  };
  document.getElementById('rest-timer-plus').onclick = () => {
    _restTimer.addSeconds(15);
  };
  document.getElementById('rest-timer-skip').onclick = () => {
    _restTimer.destroy();
    hideRestTimer();
  };
}

function hideRestTimer() {
  const bar = document.getElementById('rest-timer-bar');
  if (bar) { bar.classList.remove('active', 'done'); }
}

// ─── Finish Modal ─────────────────────────────────────────────────────────────
function showFinishModal(sessionId) {
  openModal(`
    <div class="modal-title">Finish Workout</div>
    <div class="form-group">
      <label class="form-label">Notes (optional)</label>
      <textarea id="finish-notes" rows="3" placeholder="How did it go?"></textarea>
    </div>
    <div class="form-group">
      <label class="form-label">Bodyweight (optional)</label>
      <input id="finish-bw" type="number" step="0.1" placeholder="${_prefs?.unit_system === 'metric' ? 'kg' : 'lbs'}">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="confirm-finish-btn">Finish</button>
    </div>
  `);
  window.closeModal = closeModal;

  document.getElementById('confirm-finish-btn').addEventListener('click', async () => {
    const notes = document.getElementById('finish-notes').value;
    const bwInput = document.getElementById('finish-bw').value;
    const bodyweight = bwInput ? parseWeight(bwInput, _prefs) : null;
    try {
      await finishSession(sessionId, { notes, bodyweight });
      setActiveSession(null);
      cleanup();
      closeModal();
      window._sessionActive = false;
      window.location.hash = '#history';
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseHashParams(hash) {
  const idx = hash.indexOf('?');
  if (idx === -1) return {};
  const qs = hash.slice(idx + 1);
  return Object.fromEntries(new URLSearchParams(qs));
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Warn on navigation with active session
window.addEventListener('hashchange', () => {
  if (window._sessionActive && getActiveSession()) {
    // Just a soft warning via toast since beforeunload won't work on same-page nav
    showToast('Session in progress — finish it first!', '');
  }
}, { capture: true });
