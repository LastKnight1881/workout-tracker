// api.js — ALL fetch calls live here. No fetch anywhere else.

const BASE = '';

async function request(method, path, body) {
  const opts = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d.detail || JSON.stringify(d); } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ─── Exercises ───────────────────────────────────────────────────────────────
export function getExercises(filters = {}) {
  const p = new URLSearchParams();
  if (filters.muscle_group) p.set('muscle_group', filters.muscle_group);
  if (filters.equipment) p.set('equipment', filters.equipment);
  if (filters.custom_only != null) p.set('custom_only', filters.custom_only);
  const qs = p.toString() ? '?' + p.toString() : '';
  return request('GET', `/api/exercises/${qs}`);
}
export function createExercise(data) { return request('POST', '/api/exercises/', data); }
export function updateExercise(id, data) { return request('PUT', `/api/exercises/${id}`, data); }
export function deleteExercise(id) { return request('DELETE', `/api/exercises/${id}`); }

// ─── Routines ────────────────────────────────────────────────────────────────
export function getRoutines() { return request('GET', '/api/routines/'); }
export function getActiveRoutine() { return request('GET', '/api/routines/active'); }
export function getRoutine(id) { return request('GET', `/api/routines/${id}`); }
export function createRoutine(data) { return request('POST', '/api/routines/', data); }
export function updateRoutine(id, data) { return request('PUT', `/api/routines/${id}`, data); }
export function deleteRoutine(id) { return request('DELETE', `/api/routines/${id}`); }
export function activateRoutine(id) { return request('POST', `/api/routines/${id}/activate`); }
export function addDay(routineId, data) { return request('POST', `/api/routines/${routineId}/days`, data); }
export function updateDay(routineId, dayId, data) { return request('PUT', `/api/routines/${routineId}/days/${dayId}`, data); }
export function deleteDay(routineId, dayId) { return request('DELETE', `/api/routines/${routineId}/days/${dayId}`); }
export function addExerciseToDay(dayId, data) { return request('POST', `/api/routines/days/${dayId}/exercises`, data); }
export function updateDayExercise(rdeId, data) { return request('PUT', `/api/routines/days/exercises/${rdeId}`, data); }
export function removeDayExercise(rdeId) { return request('DELETE', `/api/routines/days/exercises/${rdeId}`); }
export function reorderDayExercises(dayId, orderedIds) { return request('POST', `/api/routines/days/${dayId}/reorder`, orderedIds); }

// ─── Sessions ────────────────────────────────────────────────────────────────
export function getSessions(limit = 20, offset = 0) {
  return request('GET', `/api/sessions/?limit=${limit}&offset=${offset}`);
}
export function startSession(dayId, routineId) {
  return request('POST', '/api/sessions/start', { day_id: dayId, routine_id: routineId });
}
export function getSession(id) { return request('GET', `/api/sessions/${id}`); }
export function updateSession(id, data) { return request('PUT', `/api/sessions/${id}`, data); }
export function finishSession(id, data) { return request('POST', `/api/sessions/${id}/finish`, data); }
export function logSet(sessionId, data) { return request('POST', `/api/sessions/${sessionId}/sets`, data); }
export function deleteSet(sessionId, setId) { return request('DELETE', `/api/sessions/${sessionId}/sets/${setId}`); }
export function updateSet(sessionId, setId, data) { return request('PUT', `/api/sessions/${sessionId}/sets/${setId}`, data); }
export function getLastSets(exerciseId) { return request('GET', `/api/sessions/exercises/${exerciseId}/last`); }

// ─── Progress ────────────────────────────────────────────────────────────────
export function getPRs(exerciseId, limit = 10) {
  return request('GET', `/api/progress/prs?exercise_id=${exerciseId}&limit=${limit}`);
}
export function getVolume(exerciseId, weeks = 12) {
  return request('GET', `/api/progress/volume?exercise_id=${exerciseId}&weeks=${weeks}`);
}
export function getSuggestions() { return request('GET', '/api/progress/suggestions'); }

// ─── Preferences ─────────────────────────────────────────────────────────────
export function getPreferences() { return request('GET', '/api/preferences'); }
export function updatePreferences(data) { return request('PUT', '/api/preferences', data); }
