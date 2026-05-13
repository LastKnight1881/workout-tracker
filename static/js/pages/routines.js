// pages/routines.js — Routine Management

import {
  getRoutines, createRoutine, updateRoutine, deleteRoutine, activateRoutine,
  addDay, deleteDay, addExerciseToDay, removeDayExercise,
  getExercises
} from '../api.js';
import { showToast, openModal, closeModal } from '../utils.js';

let _container = null;

export async function init(container) {
  _container = container;
  await render();
}

async function render() {
  _container.innerHTML = '<div class="spinner"></div>';
  try {
    const routines = await getRoutines();
    _container.innerHTML = `
      <div class="page-title">Routines</div>
      <div style="margin-bottom:12px">
        <button class="btn btn-primary btn-sm" id="create-routine-btn">+ New Routine</button>
      </div>
      <div id="routines-list">
        ${routines.map(r => renderRoutineCard(r)).join('')}
      </div>
    `;
    wireEvents();
  } catch (e) {
    _container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

function renderRoutineCard(r) {
  const days = r.days || [];
  return `
    <div class="routine-card${r.is_active ? ' active-routine' : ''}" data-routine-id="${r.id}">
      <div class="routine-header" data-toggle="${r.id}">
        ${r.is_active ? '<span class="active-star" title="Active">★</span>' : ''}
        <span class="routine-name">${esc(r.name)}</span>
        <span style="color:var(--text-secondary);font-size:0.8rem">${days.length}d</span>
        <span class="btn-icon" style="font-size:0.8rem">▾</span>
      </div>
      <div class="routine-body" id="routine-body-${r.id}" style="display:none">
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${!r.is_active ? `<button class="btn btn-ghost btn-sm activate-btn" data-id="${r.id}">Set Active</button>` : ''}
          <button class="btn btn-ghost btn-sm add-day-btn" data-id="${r.id}">+ Add Day</button>
          <button class="btn btn-danger btn-sm delete-routine-btn" data-id="${r.id}">Delete</button>
        </div>
        ${days.map(d => renderDaySection(d, r.id)).join('')}
      </div>
    </div>
  `;
}

function renderDaySection(d, routineId) {
  const exercises = d.exercises || [];
  return `
    <div class="day-section" data-day-id="${d.id}">
      <div class="day-section-header">
        <span class="day-section-name">Day ${d.day_number}: ${esc(d.name)}</span>
        <button class="btn btn-ghost btn-sm add-ex-to-day-btn" data-day="${d.id}" data-routine="${routineId}">+ Add Exercise</button>
        <button class="btn btn-icon delete-day-btn" data-day="${d.id}" data-routine="${routineId}" title="Delete day">🗑</button>
      </div>
      <div class="rde-list">
        ${exercises.map(ex => `
          <div class="rde-row" data-rde-id="${ex.id}">
            <span class="rde-name">${esc(ex.exercise_name || ex.name || '')}</span>
            <span class="rde-detail">${ex.set_count}×${ex.target_reps || '?'} @ ${ex.target_weight_lbs || '?'} lbs</span>
            <button class="btn btn-icon remove-rde-btn" data-rde="${ex.id}" title="Remove">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function wireEvents() {
  // Toggle expand
  _container.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.toggle;
      const body = document.getElementById(`routine-body-${id}`);
      body.style.display = body.style.display === 'none' ? 'block' : 'none';
    });
  });

  // Create routine
  _container.querySelector('#create-routine-btn').addEventListener('click', () => {
    openModal(`
      <div class="modal-title">New Routine</div>
      <div class="form-group">
        <label class="form-label">Name</label>
        <input id="new-routine-name" type="text" placeholder="e.g. Push Pull Legs">
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="cancel-modal">Cancel</button>
        <button class="btn btn-primary" id="confirm-create-routine">Create</button>
      </div>
    `);
    document.getElementById('cancel-modal').onclick = closeModal;
    document.getElementById('confirm-create-routine').addEventListener('click', async () => {
      const name = document.getElementById('new-routine-name').value.trim();
      if (!name) return;
      try {
        await createRoutine({ name });
        closeModal();
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  // Activate routine
  _container.querySelectorAll('.activate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await activateRoutine(parseInt(btn.dataset.id));
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  // Delete routine
  _container.querySelectorAll('.delete-routine-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this routine?')) return;
      try {
        await deleteRoutine(parseInt(btn.dataset.id));
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  // Add day
  _container.querySelectorAll('.add-day-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const routineId = parseInt(btn.dataset.id);
      openModal(`
        <div class="modal-title">Add Day</div>
        <div class="form-group">
          <label class="form-label">Day Name</label>
          <input id="new-day-name" type="text" placeholder="e.g. Push A">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="confirm-add-day">Add</button>
        </div>
      `);
      document.getElementById('cancel-modal').onclick = closeModal;
      document.getElementById('confirm-add-day').addEventListener('click', async () => {
        const name = document.getElementById('new-day-name').value.trim();
        if (!name) return;
        try {
          await addDay(routineId, { name });
          closeModal();
          await render();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
  });

  // Delete day
  _container.querySelectorAll('.delete-day-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this day?')) return;
      try {
        await deleteDay(parseInt(btn.dataset.routine), parseInt(btn.dataset.day));
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });

  // Add exercise to day
  _container.querySelectorAll('.add-ex-to-day-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const dayId = parseInt(btn.dataset.day);
      const exercises = await getExercises();
      openModal(`
        <div class="modal-title">Add Exercise</div>
        <div class="form-group">
          <input id="ex-search" type="text" placeholder="Search exercises...">
        </div>
        <div id="ex-list" style="max-height:300px;overflow-y:auto;margin-bottom:12px">
          ${exercises.map(ex => `
            <div class="exercise-row" data-ex-id="${ex.id}" style="cursor:pointer">
              <div>
                <div class="exercise-row-name">${esc(ex.name)}</div>
                <div class="exercise-row-meta">${esc(ex.muscle_group || '')} · ${esc(ex.equipment || '')}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `);
      // Search filter
      document.getElementById('ex-search').addEventListener('input', function() {
        const q = this.value.toLowerCase();
        document.querySelectorAll('#ex-list .exercise-row').forEach(row => {
          row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
        });
      });
      document.querySelectorAll('#ex-list .exercise-row').forEach(row => {
        row.addEventListener('click', async () => {
          try {
            await addExerciseToDay(dayId, { exercise_id: parseInt(row.dataset.exId), set_count: 3, target_reps: '8,8,8' });
            closeModal();
            await render();
          } catch (e) { showToast(e.message, 'error'); }
        });
      });
    });
  });

  // Remove exercise from day
  _container.querySelectorAll('.remove-rde-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove exercise?')) return;
      try {
        await removeDayExercise(parseInt(btn.dataset.rde));
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
