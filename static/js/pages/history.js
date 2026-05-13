// pages/history.js — Session History + Progress Charts

import { getSessions, getSession, getExercises, getExerciseProgress, getVolume } from '../api.js';
import { formatDate, formatDuration, formatWeight } from '../utils.js';

const PAGE_SIZE = 20;
let _container = null;
let _offset = 0;
let _prefs = null;
let _activeTab = 'history';   // 'history' | 'charts'
let _chartInstances = [];     // track Chart.js instances for cleanup

export async function init(container, state) {
  _container = container;
  _offset = 0;
  _prefs = state.prefs;
  _destroyCharts();
  renderShell();
  await showTab(_activeTab);
}

// ─── Shell (tabs) ─────────────────────────────────────────────────────────────
function renderShell() {
  _container.innerHTML = `
    <div class="page-title">History</div>
    <div class="tab-bar">
      <button class="tab-btn${_activeTab === 'history' ? ' active' : ''}" data-tab="history">Log</button>
      <button class="tab-btn${_activeTab === 'charts' ? ' active' : ''}" data-tab="charts">Progress Charts</button>
    </div>
    <div id="tab-content"></div>
  `;
  _container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      _activeTab = btn.dataset.tab;
      _container.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === _activeTab));
      _destroyCharts();
      await showTab(_activeTab);
    });
  });
}

async function showTab(tab) {
  const content = document.getElementById('tab-content');
  if (!content) return;
  if (tab === 'history') {
    await renderHistory(content);
  } else {
    await renderCharts(content);
  }
}

// ─── History Log ──────────────────────────────────────────────────────────────
async function renderHistory(content) {
  content.innerHTML = '<div class="spinner"></div>';
  try {
    const data = await getSessions(PAGE_SIZE, _offset);
    const sessions = Array.isArray(data) ? data : (data.sessions || []);

    content.innerHTML = `
      <div id="history-list">
        ${sessions.length
          ? sessions.map(s => renderSessionRow(s)).join('')
          : '<div class="empty-state"><p>No sessions yet.</p></div>'}
      </div>
      <div class="pagination">
        ${_offset > 0 ? '<button class="btn btn-ghost btn-sm" id="prev-page">← Prev</button>' : ''}
        ${sessions.length === PAGE_SIZE ? '<button class="btn btn-ghost btn-sm" id="next-page">Next →</button>' : ''}
      </div>
    `;

    wireHistory(content);
    document.getElementById('prev-page')?.addEventListener('click', () => { _offset -= PAGE_SIZE; renderHistory(content); });
    document.getElementById('next-page')?.addEventListener('click', () => { _offset += PAGE_SIZE; renderHistory(content); });
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
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

function wireHistory(content) {
  content.querySelectorAll('.history-item-header').forEach(header => {
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

// ─── Progress Charts ──────────────────────────────────────────────────────────
async function renderCharts(content) {
  content.innerHTML = '<div class="spinner"></div>';
  try {
    // Load exercise list for the picker
    const exercises = await getExercises();
    const sorted = [...exercises].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    content.innerHTML = `
      <div class="charts-controls">
        <label class="form-label">Exercise</label>
        <select id="chart-exercise-picker" class="form-control">
          ${sorted.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}
        </select>
      </div>
      <div id="charts-area">
        <div class="spinner"></div>
      </div>
    `;

    const picker = content.querySelector('#chart-exercise-picker');
    const loadCharts = async () => {
      const exId = parseInt(picker.value);
      await renderExerciseCharts(exId, content.querySelector('#charts-area'));
    };

    picker.addEventListener('change', loadCharts);
    await loadCharts();
  } catch (e) {
    content.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

async function renderExerciseCharts(exerciseId, area) {
  area.innerHTML = '<div class="spinner"></div>';
  _destroyCharts();

  try {
    const [progress, volume] = await Promise.all([
      getExerciseProgress(exerciseId, 30),
      getVolume(exerciseId, 16),
    ]);

    if (!progress.length) {
      area.innerHTML = '<p class="empty-state" style="padding:24px">No data logged for this exercise yet.</p>';
      return;
    }

    // Reverse so chronological (oldest first)
    const prog = [...progress].reverse();
    const vol = [...volume].reverse();

    area.innerHTML = `
      <div class="chart-card">
        <div class="chart-title">Weight Over Time (lbs)</div>
        <canvas id="chart-weight" height="180"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Estimated 1RM Over Time</div>
        <canvas id="chart-1rm" height="180"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-title">Weekly Volume (lbs)</div>
        <canvas id="chart-volume" height="180"></canvas>
      </div>
    `;

    const chartDefaults = {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#aaa', maxTicksLimit: 8 }, grid: { color: '#333' } },
        y: { ticks: { color: '#aaa' }, grid: { color: '#333' } },
      },
    };

    // Weight chart
    _chartInstances.push(new Chart(document.getElementById('chart-weight'), {
      type: 'line',
      data: {
        labels: prog.map(p => p.date),
        datasets: [{
          data: prog.map(p => p.weight),
          borderColor: '#4f8ef7',
          backgroundColor: 'rgba(79,142,247,0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
        }],
      },
      options: chartDefaults,
    }));

    // Estimated 1RM chart
    _chartInstances.push(new Chart(document.getElementById('chart-1rm'), {
      type: 'line',
      data: {
        labels: prog.map(p => p.date),
        datasets: [{
          data: prog.map(p => p.estimated_1rm ? Math.round(p.estimated_1rm) : null),
          borderColor: '#f7a74f',
          backgroundColor: 'rgba(247,167,79,0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          spanGaps: true,
        }],
      },
      options: chartDefaults,
    }));

    // Weekly volume chart
    if (vol.length) {
      _chartInstances.push(new Chart(document.getElementById('chart-volume'), {
        type: 'bar',
        data: {
          labels: vol.map(v => v.date),
          datasets: [{
            data: vol.map(v => v.total_volume_lbs),
            backgroundColor: 'rgba(79,247,153,0.55)',
            borderColor: '#4ff799',
            borderWidth: 1,
          }],
        },
        options: chartDefaults,
      }));
    } else {
      document.getElementById('chart-volume').closest('.chart-card').innerHTML =
        '<p style="color:var(--text-secondary);padding:12px">No volume data.</p>';
    }

  } catch (e) {
    area.innerHTML = `<div class="empty-state"><p>${e.message}</p></div>`;
  }
}

function _destroyCharts() {
  _chartInstances.forEach(c => { try { c.destroy(); } catch {} });
  _chartInstances = [];
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
