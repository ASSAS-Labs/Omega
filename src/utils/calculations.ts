export type WeightUnit = 'kg' | 'lbs';

export const KG_PER_LB = 0.45359237; // 1 lb = 0.45359237 kg
export const LBS_PER_KG = 1 / KG_PER_LB; // 1 kg ≈ 2.20462262 lbs

export interface ExerciseSet {
  weight: number;
  reps: number;
}

/**
 * Calculates the total training volume from an array of sets.
 * Total Volume = Sum of (Weight * Reps) for each set.
 *
 * @param sets - Array of workout sets with weight and reps
 * @returns Total volume as a number (returns 0 if empty or invalid)
 */
export function calculateTotalVolume(sets: { weight: number; reps: number }[]): number {
  if (!sets || !Array.isArray(sets) || sets.length === 0) {
    return 0;
  }

  return sets.reduce((total, set) => {
    const weight = typeof set.weight === 'number' && !isNaN(set.weight) && set.weight > 0 ? set.weight : 0;
    const reps = typeof set.reps === 'number' && !isNaN(set.reps) && set.reps > 0 ? set.reps : 0;
    return total + weight * reps;
  }, 0);
}


/**
 * Estimates One-Rep Max (1RM) using the Epley formula:
 * 1RM = Weight * (1 + Reps / 30)
 *
 * Edge cases:
 * - If reps === 1, returns the exact weight lifted.
 * - If weight <= 0 or reps <= 0, returns 0.
 *
 * @param weight - Weight lifted (in kg or lbs)
 * @param reps - Number of repetitions completed
 * @returns Estimated 1RM rounded to 2 decimal places
 */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (
    typeof weight !== 'number' ||
    isNaN(weight) ||
    typeof reps !== 'number' ||
    isNaN(reps) ||
    weight <= 0 ||
    reps <= 0
  ) {
    return 0;
  }

  if (reps === 1) {
    return weight;
  }

  const epleyMax = weight * (1 + reps / 30);
  return Math.round(epleyMax * 100) / 100;
}


/** Converts pounds (lbs) to kilograms (kg). */
export function lbsToKg(lbs: number): number {
  if (typeof lbs !== 'number' || isNaN(lbs) || lbs < 0) return 0;
  return lbs * KG_PER_LB;
}

/** Converts kilograms (kg) to pounds (lbs). */
export function kgToLbs(kg: number): number {
  if (typeof kg !== 'number' || isNaN(kg) || kg < 0) return 0;
  return kg / KG_PER_LB;
}

/** Converts a canonical kg value into the display unit. */
export function convertWeight(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? kgToLbs(kg) : kg;
}

/** Converts a user-entered value (in `unit`) back to canonical kg for storage. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === 'lbs' ? lbsToKg(value) : value;
}

/** Rounds a converted value to at most N decimals (default 1 decimal place, e.g. 88.18 -> 88.2). */
export function roundWeight(value: number, decimals: number = 1): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Formats a canonical kg value with its unit, e.g. 40 -> "40 kg", 100 -> "220.5 lbs". */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const v = roundWeight(convertWeight(kg, unit));
  const text = Number.isInteger(v) ? String(v) : v.toFixed(1);
  return `${text} ${unit}`;
}

