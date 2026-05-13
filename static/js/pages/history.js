// pages/history.js — Session History (read-only, paginated)

import { getSessions, getSession } from '../api.js';
import { formatDate, formatDuration, formatWeight } from '../utils.js';

const PAGE_SIZE = 20;
let _container = null;
let _offset = 0;
let _prefs = null;

export async function init(container, state) {
  _container = container;
  _offset = 0;
  _prefs = state.prefs;
  await render();
}

async function render() {
  _container.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await getSessions(PAGE_SIZE, _offset);
    const sessions = Array.isArray(data) ? data : (data.sessions || []);
    const total = data.total || sessions.length;

    _container.innerHTML = `
      <div class="page-title">History</div>
      <div id="history-list">
        ${sessions.length ? sessions.map(s => renderSessionRow(s)).join('') : '<div class="empty-state"><p>No sessions yet.</p></div>'}
      </div>
      <div class="pagination">
        ${_offset > 0 ? '<button class="btn btn-ghost btn-sm" id="prev-page">← Prev</button>' : ''}
        ${sessions.length === PAGE_SIZE ? '<button class="btn btn-ghost btn-sm" id="next-page">Next →</button>' : ''}
      </div>
    `;

    wireHistory();
    document.getElementById('prev-page')?.addEventListener('click', () => { _offset -= PAGE_SIZE; render(); });
    document.getElementById('next-page')?.addEventListener('click', () => { _offset += PAGE_SIZE; render(); });
  } catch (e) {
    _container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

function renderSessionRow(s) {
  const dur = s.finished_at && s.started_at
    ? formatDuration((new Date(s.finished_at) - new Date(s.started_at)) / 1000)
    : s.finished_at ? '—' : 'In progress';
  const sets = s.total_sets ?? s.sets?.length ?? '—';
  return `
    <div class="history-item">
      <div class="history-item-header" data-session-id="${s.id}">
        <div>
          <div class="history-date">${formatDate(s.started_at)}</div>
          <div class="history-day">${esc(s.day_name || s.routine_day_name || '')}</div>
        </div>
        <div class="history-meta">
          <span>${dur}</span>
          <span>${sets} sets</span>
        </div>
      </div>
      <div class="history-detail" id="hist-detail-${s.id}" style="display:none"></div>
    </div>
  `;
}

function wireHistory() {
  _container.querySelectorAll('.history-item-header').forEach(header => {
    header.addEventListener('click', async () => {
      const id = parseInt(header.dataset.sessionId);
      const detail = document.getElementById(`hist-detail-${id}`);
      if (detail.style.display === 'none') {
        if (!detail.dataset.loaded) {
          detail.innerHTML = '<div class="spinner"></div>';
          detail.style.display = 'block';
          try {
            const full = await getSession(id);
            detail.innerHTML = renderDetail(full);
            detail.dataset.loaded = '1';
          } catch (e) {
            detail.innerHTML = `<p style="color:var(--danger)">${e.message}</p>`;
          }
        } else {
          detail.style.display = 'block';
        }
      } else {
        detail.style.display = 'none';
      }
    });
  });
}

function renderDetail(session) {
  const exercises = session.exercises || [];
  if (!exercises.length) return '<p style="color:var(--text-secondary);padding:8px 0">No sets logged.</p>';
  return exercises.map(ex => {
    const sets = ex.sets || [];
    return `
      <div class="history-exercise">
        <div class="history-exercise-name">${esc(ex.exercise_name || ex.name || '')}</div>
        ${sets.map(s => `
          <div class="history-set-row">
            <span>Set ${s.set_number}</span>
            <span>${formatWeight(s.weight_lbs, _prefs)} × ${s.reps} reps</span>
            ${s.is_pr ? '<span class="pr-badge">🏆 PR</span>' : ''}
            ${s.is_warmup ? '<span class="warmup-badge">W</span>' : ''}
          </div>
        `).join('')}
      </div>
    `;
  }).join('');
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
