// pages/exercises.js — Exercise Library

import { getExercises, createExercise, updateExercise, deleteExercise } from '../api.js';
import { showToast, openModal, closeModal } from '../utils.js';

let _container = null;
let _all = [];

const MUSCLE_GROUPS = ['Chest','Back','Shoulders','Biceps','Triceps','Legs','Glutes','Core','Calves','Forearms'];
const EQUIPMENT = ['Barbell','Dumbbell','Machine','Cable','Bodyweight','Kettlebell','Bands','Other'];

export async function init(container) {
  _container = container;
  await render();
}

async function render() {
  _container.innerHTML = '<div class="spinner"></div>';
  try {
    _all = await getExercises();
    _container.innerHTML = `
      <div class="page-title">Exercises</div>
      <div class="filter-row">
        <input id="ex-search" type="text" placeholder="Search...">
        <select id="ex-muscle">
          <option value="">All muscles</option>
          ${MUSCLE_GROUPS.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
        <select id="ex-equip">
          <option value="">All equipment</option>
          ${EQUIPMENT.map(e => `<option value="${e}">${e}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px">
        <button class="btn btn-primary btn-sm" id="add-custom-btn">+ Add Custom</button>
      </div>
      <div class="card" style="padding:0 16px" id="ex-list">
        ${renderList(_all)}
      </div>
    `;
    wireFilters();
    wireList();
    document.getElementById('add-custom-btn').addEventListener('click', showCreateModal);
  } catch (e) {
    _container.innerHTML = `<div class="empty-state"><h2>Error</h2><p>${e.message}</p></div>`;
  }
}

function renderList(exercises) {
  if (!exercises.length) return '<div style="padding:16px;color:var(--text-secondary)">No exercises found.</div>';
  return exercises.map(ex => `
    <div class="exercise-row" data-id="${ex.id}">
      <div style="flex:1">
        <div class="exercise-row-name">${esc(ex.name)} ${ex.is_custom ? '<span class="custom-badge">custom</span>' : ''}</div>
        <div class="exercise-row-meta">${esc(ex.muscle_group || '')} · ${esc(ex.equipment || '')}</div>
      </div>
      ${ex.is_custom ? `
        <button class="btn btn-icon edit-ex-btn" data-id="${ex.id}" title="Edit">✏️</button>
        <button class="btn btn-icon del-ex-btn" data-id="${ex.id}" title="Delete">🗑</button>
      ` : ''}
    </div>
  `).join('');
}

function wireFilters() {
  const doFilter = () => {
    const q = document.getElementById('ex-search').value.toLowerCase();
    const muscle = document.getElementById('ex-muscle').value;
    const equip = document.getElementById('ex-equip').value;
    const filtered = _all.filter(ex =>
      (!q || ex.name.toLowerCase().includes(q)) &&
      (!muscle || ex.muscle_group === muscle) &&
      (!equip || ex.equipment === equip)
    );
    document.getElementById('ex-list').innerHTML = renderList(filtered);
    wireList();
  };
  document.getElementById('ex-search').addEventListener('input', doFilter);
  document.getElementById('ex-muscle').addEventListener('change', doFilter);
  document.getElementById('ex-equip').addEventListener('change', doFilter);
}

function wireList() {
  _container.querySelectorAll('.edit-ex-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ex = _all.find(e => e.id === parseInt(btn.dataset.id));
      if (ex) showEditModal(ex);
    });
  });
  _container.querySelectorAll('.del-ex-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this exercise?')) return;
      try {
        await deleteExercise(parseInt(btn.dataset.id));
        await render();
      } catch (e) { showToast(e.message, 'error'); }
    });
  });
}

function showCreateModal() {
  openModal(exerciseForm('Add Custom Exercise', {}, 'create-ex-confirm'));
  document.getElementById('cancel-modal').onclick = closeModal;
  document.getElementById('create-ex-confirm').addEventListener('click', async () => {
    const data = readForm();
    if (!data.name) { showToast('Name required', 'error'); return; }
    try {
      await createExercise({ ...data, is_custom: true });
      closeModal();
      await render();
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function showEditModal(ex) {
  openModal(exerciseForm('Edit Exercise', ex, 'save-ex-confirm'));
  document.getElementById('cancel-modal').onclick = closeModal;
  document.getElementById('save-ex-confirm').addEventListener('click', async () => {
    const data = readForm();
    if (!data.name) { showToast('Name required', 'error'); return; }
    try {
      await updateExercise(ex.id, data);
      closeModal();
      await render();
    } catch (e) { showToast(e.message, 'error'); }
  });
}

function exerciseForm(title, ex, confirmId) {
  return `
    <div class="modal-title">${title}</div>
    <div class="form-group"><label class="form-label">Name</label>
      <input id="ex-name" type="text" value="${esc(ex.name || '')}"></div>
    <div class="form-group"><label class="form-label">Muscle Group</label>
      <select id="ex-mg">
        <option value="">—</option>
        ${MUSCLE_GROUPS.map(g => `<option value="${g}"${ex.muscle_group===g?' selected':''}>${g}</option>`).join('')}
      </select></div>
    <div class="form-group"><label class="form-label">Equipment</label>
      <select id="ex-eq">
        <option value="">—</option>
        ${EQUIPMENT.map(e => `<option value="${e}"${ex.equipment===e?' selected':''}>${e}</option>`).join('')}
      </select></div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="cancel-modal">Cancel</button>
      <button class="btn btn-primary" id="${confirmId}">Save</button>
    </div>
  `;
}

function readForm() {
  return {
    name: document.getElementById('ex-name').value.trim(),
    muscle_group: document.getElementById('ex-mg').value || null,
    equipment: document.getElementById('ex-eq').value || null,
  };
}

function esc(s) { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
