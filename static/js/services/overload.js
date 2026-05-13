// services/overload.js — progressive overload suggestion formatting

/**
 * Given a suggestion object from GET /api/progress/suggestions,
 * returns a human-readable display string.
 */
export function formatSuggestion(suggestion) {
  if (!suggestion) return '';
  const { exercise_name, suggested_weight_lbs, suggested_reps, reason } = suggestion;
  const parts = [];
  if (exercise_name) parts.push(exercise_name + ':');
  if (suggested_weight_lbs != null) parts.push(`${suggested_weight_lbs} lbs`);
  if (suggested_reps != null) parts.push(`× ${suggested_reps} reps`);
  if (reason) parts.push(`(${reason})`);
  return parts.join(' ');
}
