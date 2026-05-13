// pages/routines.js — Routine Management

import {
  getRoutines, createRoutine, updateRoutine, deleteRoutine, activateRoutine,
  addDay, updateDay, deleteDay, addExerciseToDay, updateDayExercise, removeDayExercise,
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
          <button class="btn btn-ghost btn-sm edit-routine-btn" data-id="${r.id}" data-name="${esc(r.name)}">✎ Rename</button>
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
        <button class="btn btn-ghost btn-sm edit-day-btn" data-day="${d.id}" data-routine="${routineId}" data-num="${d.day_number}" data-name="${esc(d.name || '')}">✎ Edit Day</button>
        <button class="btn btn-ghost btn-sm add-ex-to-day-btn" data-day="${d.id}" data-routine="${routineId}">+ Add Exercise</button>
        <button class="btn btn-icon delete-day-btn" data-day="${d.id}" data-routine="${routineId}" title="Delete day">🗑</button>
      </div>
      <div class="rde-list">
        ${exercises.map(ex => `
          <div class="rde-row" data-rde-id="${ex.id}">
            <span class="rde-name">${esc(ex.exercise_name || '')}</span>
            <span class="rde-detail">${ex.default_sets || ex.set_count || 3}×${ex.target_reps || '?'} @ ${ex.default_weight ?? ex.target_weight_lbs ?? 'BW'} lbs</span>
            <button class="btn btn-ghost btn-icon edit-rde-btn" data-rde="${ex.id}" title="Edit">✎</button>
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

  // Rename routine
  _container.querySelectorAll('.edit-routine-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id);
      const current = btn.dataset.name;
      openModal(`
        <div class="modal-title">Rename Routine</div>
        <div class="form-group">
          <label class="form-label">Name</label>
          <input id="edit-routine-name" type="text" value="${esc(current)}">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="confirm-edit-routine">Save</button>
        </div>
      `);
      document.getElementById('cancel-modal').onclick = closeModal;
      document.getElementById('confirm-edit-routine').addEventListener('click', async () => {
        const name = document.getElementById('edit-routine-name').value.trim();
        if (!name) return;
        try {
          await updateRoutine(id, { name });
          closeModal();
          await render();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
  });

  // Edit day (rename + day number)
  _container.querySelectorAll('.edit-day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const routineId = parseInt(btn.dataset.routine);
      const dayId = parseInt(btn.dataset.day);
      const currentName = btn.dataset.name;
      const currentNum = btn.dataset.num;
      openModal(`
        <div class="modal-title">Edit Day</div>
        <div class="form-group">
          <label class="form-label">Day Number</label>
          <input id="edit-day-num" type="number" value="${esc(currentNum)}" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Day Name</label>
          <input id="edit-day-name" type="text" value="${esc(currentName)}">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="confirm-edit-day">Save</button>
        </div>
      `);
      document.getElementById('cancel-modal').onclick = closeModal;
      document.getElementById('confirm-edit-day').addEventListener('click', async () => {
        const name = document.getElementById('edit-day-name').value.trim();
        const day_number = parseInt(document.getElementById('edit-day-num').value);
        if (!name || !day_number) return;
        try {
          await updateDay(routineId, dayId, { name, day_number });
          closeModal();
          await render();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
  });

  // Edit RDE (sets, reps, weight)
  _container.querySelectorAll('.edit-rde-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const rdeId = parseInt(btn.dataset.rde);
      const row = btn.closest('.rde-row');
      openModal(`
        <div class="modal-title">Edit Exercise Slot</div>
        <div class="form-group">
          <label class="form-label">Default Sets</label>
          <input id="rde-sets" type="number" value="3" min="1" max="20">
        </div>
        <div class="form-group">
          <label class="form-label">Target Reps (comma-separated, e.g. 8,8,8,12)</label>
          <input id="rde-reps" type="text" placeholder="8,8,8">
        </div>
        <div class="form-group">
          <label class="form-label">Default Weight (lbs, blank = bodyweight)</label>
          <input id="rde-weight" type="number" step="2.5" min="0" placeholder="BW">
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="cancel-modal">Cancel</button>
          <button class="btn btn-primary" id="confirm-edit-rde">Save</button>
        </div>
      `);
      document.getElementById('cancel-modal').onclick = closeModal;
      document.getElementById('confirm-edit-rde').addEventListener('click', async () => {
        const default_sets = parseInt(document.getElementById('rde-sets').value) || 3;
        const target_reps = document.getElementById('rde-reps').value.trim() || null;
        const wVal = document.getElementById('rde-weight').value.trim();
        const default_weight = wVal ? parseFloat(wVal) : null;
        try {
          await updateDayExercise(rdeId, { default_sets, target_reps, default_weight });
          closeModal();
          await render();
        } catch (e) { showToast(e.message, 'error'); }
      });
    });
  });
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
