// pages/home.js — Dashboard

import { getActiveRoutine, getSessions, getRoutine } from '../api.js';
import { formatDate, formatDuration } from '../utils.js';

export async function init(container, state) {
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const [routine, sessions] = await Promise.allSettled([
      getActiveRoutine(),
      getSessions(3, 0),
    ]);

    const activeRoutine = routine.status === 'fulfilled' ? routine.value : null;
    const recentSessions = sessions.status === 'fulfilled' ? (sessions.value.sessions || sessions.value || []) : [];

    container.innerHTML = renderHome(activeRoutine, recentSessions.slice(0, 3), state.prefs);
  } catch (e) {
    container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

function renderHome(routine, sessions, prefs) {
  let routineHtml = '';
  if (routine) {
    const days = routine.days || [];
    const totalDays = days.length;
    routineHtml = `
      <div class="home-routine-box">
        <div class="home-routine-name">${esc(routine.name)}</div>
        <div class="home-day-cycle">${totalDays}-day cycle</div>
        <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap">
          ${days.map(d => `
            <a href="#session?day=${d.id}&routine=${routine.id}" class="btn btn-primary" style="flex:1;min-width:120px;">
              Day ${d.day_number}: ${esc(d.name)}
            </a>
          `).join('')}
        </div>
      </div>
    `;
  } else {
    routineHtml = `
      <div class="empty-state">
        <h2>No active routine</h2>
        <p>Set up a routine to start tracking.</p>
        <a href="#routines" class="btn btn-primary">Go to Routines</a>
      </div>
    `;
  }

  const sessHtml = sessions.length ? `
    <div class="section-title">Recent Sessions</div>
    <div class="card" style="padding:0 16px">
      ${sessions.map(s => {
        const dur = s.finished_at && s.started_at
          ? formatDuration((new Date(s.finished_at) - new Date(s.started_at)) / 1000)
          : '—';
        return `
          <div class="recent-session-row">
            <div>
              <div class="recent-date">${formatDate(s.started_at)}</div>
              <div class="recent-day">${esc(s.day_name || s.routine_day_name || '')}</div>
            </div>
            <div class="recent-duration">${dur}</div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  return `
    <div class="page-title">Workout Tracker</div>
    ${routineHtml}
    ${sessHtml}
  `;
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
