// pages/settings.js — User Preferences

import { getPreferences, updatePreferences } from '../api.js';
import { showToast } from '../utils.js';
import { setState } from '../app.js';

export async function init(container, state) {
  let prefs = state.prefs;
  try {
    prefs = await getPreferences();
  } catch {}
  renderSettings(container, prefs);
}

function renderSettings(container, prefs) {
  container.innerHTML = `
    <div class="page-title">Settings</div>
    <div class="settings-section">
      <div class="section-title">Units</div>
      <div class="card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Weight Unit</div>
            <div class="settings-sub">Affects all weight display</div>
          </div>
          <div class="radio-group" id="unit-radio">
            <div class="radio-opt${prefs.unit_system === 'imperial' ? ' selected' : ''}" data-val="imperial">lbs</div>
            <div class="radio-opt${prefs.unit_system === 'metric' ? ' selected' : ''}" data-val="metric">kg</div>
          </div>
        </div>
      </div>
    </div>
    <div class="settings-section">
      <div class="section-title">Rest Timer</div>
      <div class="card">
        <div class="settings-row">
          <div>
            <div class="settings-label">Default Rest</div>
            <div class="settings-sub">Seconds between sets</div>
          </div>
          <div class="stepper">
            <button class="btn btn-ghost btn-sm" id="rest-minus">−</button>
            <input id="rest-input" type="number" value="${prefs.rest_timer_sec}" min="10" max="600" step="5">
            <button class="btn btn-ghost btn-sm" id="rest-plus">+</button>
          </div>
        </div>
      </div>
    </div>
    <button class="btn btn-primary btn-block" id="save-settings-btn">Save</button>
    <div class="settings-section" style="margin-top:32px">
      <div class="section-title">About</div>
      <div class="card">
        <div class="settings-row">
          <span class="settings-label">Version</span>
          <span style="color:var(--text-secondary)">0.1.0</span>
        </div>
        <div class="settings-row">
          <span class="settings-label">Repository</span>
          <a href="https://github.com/LastKnight1881/workout-tracker" target="_blank" style="color:var(--accent);font-size:0.85rem">GitHub ↗</a>
        </div>
      </div>
    </div>
  `;

  // Unit radio
  container.querySelectorAll('.radio-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      container.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });

  // Rest timer stepper
  const restInput = container.querySelector('#rest-input');
  container.querySelector('#rest-minus').addEventListener('click', () => {
    restInput.value = Math.max(10, parseInt(restInput.value) - 15);
  });
  container.querySelector('#rest-plus').addEventListener('click', () => {
    restInput.value = Math.min(600, parseInt(restInput.value) + 15);
  });

  // Save
  container.querySelector('#save-settings-btn').addEventListener('click', async () => {
    const unit_system = container.querySelector('.radio-opt.selected')?.dataset.val || 'imperial';
    const rest_timer_sec = parseInt(restInput.value) || 90;
    try {
      const updated = await updatePreferences({ unit_system, rest_timer_sec });
      setState({ prefs: updated });
      showToast('Settings saved', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  });
}
