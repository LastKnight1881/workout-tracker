// services/plateCalc.js — plate calculator, pure logic

const PLATE_SIZES_LBS = [45, 35, 25, 10, 5, 2.5];

/**
 * Calculate plates per side for a given target weight.
 * @param {number} targetLbs
 * @param {number} barWeightLbs  default 45
 * @returns {Array<{weight: number, count: number}>}  plates per side
 */
export function calcPlates(targetLbs, barWeightLbs = 45) {
  const perSide = (targetLbs - barWeightLbs) / 2;
  if (perSide <= 0) return [];
  let remaining = perSide;
  const result = [];
  for (const plate of PLATE_SIZES_LBS) {
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      result.push({ weight: plate, count });
      remaining -= count * plate;
      remaining = Math.round(remaining * 1000) / 1000;
    }
  }
  return result;
}

/**
 * Format plate breakdown as a string, e.g. "2×45, 1×10, 1×2.5"
 */
export function formatPlates(targetLbs, barWeightLbs = 45) {
  const plates = calcPlates(targetLbs, barWeightLbs);
  if (!plates.length) return 'Bar only';
  return plates.map(p => `${p.count}×${p.weight}`).join(', ') + ' per side';
}
