import {
  calculateTotalVolume,
  estimateOneRepMax,
  kgToLbs,
  lbsToKg,
  convertWeight,
  toKg,
  roundWeight,
  formatWeight,
  KG_PER_LB,
  LBS_PER_KG,
} from '../calculations';

describe('Calculations Utility', () => {
  describe('calculateTotalVolume', () => {
    it('should correctly calculate total volume across multiple sets', () => {
      const sets = [
        { weight: 100, reps: 10 }, // 1000
        { weight: 100, reps: 8 },  // 800
        { weight: 80, reps: 12 },  // 960
      ];

      expect(calculateTotalVolume(sets)).toBe(2760);
    });

    it('should accurately aggregate volume across multi-exercise workouts', () => {
      const benchPressSets = [
        { weight: 80, reps: 10 },  // 800
        { weight: 90, reps: 8 },   // 720
        { weight: 100, reps: 6 },  // 600
      ];
      const squatSets = [
        { weight: 120, reps: 5 },  // 600
        { weight: 140, reps: 5 },  // 700
      ];

      const allSets = [...benchPressSets, ...squatSets];
      expect(calculateTotalVolume(allSets)).toBe(3420);
    });

    it('should correctly calculate volume for a single set', () => {
      const sets = [{ weight: 225, reps: 5 }];
      expect(calculateTotalVolume(sets)).toBe(1125);
    });

    it('should return 0 when given an empty sets array', () => {
      expect(calculateTotalVolume([])).toBe(0);
    });

    it('should return 0 when sets array is null or undefined', () => {
      // @ts-expect-error - testing invalid runtime input
      expect(calculateTotalVolume(null)).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(calculateTotalVolume(undefined)).toBe(0);
    });

    it('should handle sets with zero or negative reps/weight gracefully', () => {
      const sets = [
        { weight: 100, reps: 0 },
        { weight: 0, reps: 10 },
        { weight: -50, reps: 5 },
        { weight: 50, reps: -2 },
        { weight: 60, reps: 5 }, // 300
      ];

      expect(calculateTotalVolume(sets)).toBe(300);
    });
  });

  describe('estimateOneRepMax (Epley Formula)', () => {
    it('should return the exact weight for 1-rep edge cases', () => {
      expect(estimateOneRepMax(100, 1)).toBe(100);
      expect(estimateOneRepMax(225.5, 1)).toBe(225.5);
      expect(estimateOneRepMax(50, 1)).toBe(50);
    });

    it('should calculate estimated 1RM using Epley formula: Weight * (1 + Reps / 30)', () => {
      // 100 * (1 + 10 / 30) = 100 * 1.33333... = 133.33
      expect(estimateOneRepMax(100, 10)).toBe(133.33);

      // 80 * (1 + 5 / 30) = 80 * 1.16666... = 93.33
      expect(estimateOneRepMax(80, 5)).toBe(93.33);

      // 60 * (1 + 6 / 30) = 60 * 1.2 = 72
      expect(estimateOneRepMax(60, 6)).toBe(72);

      // 100 * (1 + 15 / 30) = 100 * 1.5 = 150
      expect(estimateOneRepMax(100, 15)).toBe(150);
    });

    it('should correctly handle high rep counts', () => {
      // 50 * (1 + 20 / 30) = 50 * 1.66667 = 83.33
      expect(estimateOneRepMax(50, 20)).toBe(83.33);

      // 40 * (1 + 30 / 30) = 40 * 2 = 80
      expect(estimateOneRepMax(40, 30)).toBe(80);

      // 20 * (1 + 50 / 30) = 20 * (1 + 1.66667) = 53.33
      expect(estimateOneRepMax(20, 50)).toBe(53.33);
    });

    it('should return 0 for zero or negative reps', () => {
      expect(estimateOneRepMax(100, 0)).toBe(0);
      expect(estimateOneRepMax(100, -5)).toBe(0);
    });

    it('should return 0 for zero or negative weight', () => {
      expect(estimateOneRepMax(0, 10)).toBe(0);
      expect(estimateOneRepMax(-100, 5)).toBe(0);
    });

    it('should return 0 for invalid non-number inputs', () => {
      // @ts-expect-error - testing invalid runtime input
      expect(estimateOneRepMax('100', 5)).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(estimateOneRepMax(100, null)).toBe(0);
      expect(estimateOneRepMax(NaN, 5)).toBe(0);
    });

  });

  describe('Weight Unit Conversions (KG <-> LBS)', () => {
    it('should validate standard conversion ratio: 1 kg ≈ 2.20462 lbs', () => {
      expect(KG_PER_LB).toBeCloseTo(0.45359237, 7);
      expect(LBS_PER_KG).toBeCloseTo(2.20462, 4);
      expect(kgToLbs(1)).toBeCloseTo(2.20462, 4);
      expect(lbsToKg(2.20462262)).toBeCloseTo(1, 4);
    });

    it('should accurately convert 100 kg to lbs and round to 1 decimal place (220.5 lbs)', () => {
      const rawLbs = kgToLbs(100);
      expect(rawLbs).toBeCloseTo(220.462, 2);
      expect(roundWeight(rawLbs)).toBe(220.5);
      expect(convertWeight(100, 'lbs')).toBeCloseTo(220.462, 2);
      expect(roundWeight(convertWeight(100, 'lbs'))).toBe(220.5);
    });

    it('should accurately convert 50 lbs to kg and round to 1 decimal place (22.7 kg)', () => {
      const rawKg = lbsToKg(50);
      expect(rawKg).toBeCloseTo(22.6796, 3);
      expect(roundWeight(rawKg)).toBe(22.7);
      expect(toKg(50, 'lbs')).toBeCloseTo(22.6796, 3);
      expect(roundWeight(toKg(50, 'lbs'))).toBe(22.7);
    });

    it('should preserve kg values unchanged when active unit is kg', () => {
      expect(convertWeight(80, 'kg')).toBe(80);
      expect(toKg(80, 'kg')).toBe(80);
    });

    it('should perform reversible conversion parity check (kg -> lbs -> kg)', () => {
      const testWeightsKg = [20, 42.5, 60, 82.5, 100, 142.5, 200];

      testWeightsKg.forEach((kg) => {
        const lbs = kgToLbs(kg);
        const backToKg = lbsToKg(lbs);
        expect(backToKg).toBeCloseTo(kg, 5);
      });
    });

    it('should perform reversible conversion parity check (lbs -> kg -> lbs)', () => {
      const testWeightsLbs = [45, 95, 135, 185, 225, 315, 405];

      testWeightsLbs.forEach((lbs) => {
        const kg = lbsToKg(lbs);
        const backToLbs = kgToLbs(kg);
        expect(backToLbs).toBeCloseTo(lbs, 5);
      });
    });

    it('should correctly format weights with unit labels', () => {
      expect(formatWeight(40, 'kg')).toBe('40 kg');
      expect(formatWeight(100, 'lbs')).toBe('220.5 lbs');
      expect(formatWeight(88.18, 'kg')).toBe('88.2 kg');
      expect(formatWeight(88.12, 'kg')).toBe('88.1 kg');
      expect(formatWeight(80.5, 'kg')).toBe('80.5 kg');
    });

    it('should handle zero, negative, and non-number inputs for conversions gracefully', () => {
      expect(kgToLbs(0)).toBe(0);
      expect(lbsToKg(0)).toBe(0);
      expect(kgToLbs(-10)).toBe(0);
      expect(lbsToKg(-10)).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(kgToLbs('invalid')).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(lbsToKg('invalid')).toBe(0);
      expect(roundWeight(NaN)).toBe(0);
      // @ts-expect-error - testing invalid runtime input
      expect(roundWeight('100')).toBe(0);
    });

  });
});
