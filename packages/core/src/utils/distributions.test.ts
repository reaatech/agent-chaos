import { describe, expect, it } from 'vitest';
import { burst, exponential, normal, sampleDistribution, uniform } from './distributions.js';
import { SeededRandom } from './RandomSource.js';

describe('distributions', () => {
  describe('uniform', () => {
    it('should return values within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const v = uniform(10, 20);
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('exponential', () => {
    it('should return values within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const v = exponential(10, 20);
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(20);
      }
    });

    it('should return min when max <= min', () => {
      expect(exponential(10, 10)).toBe(10);
      expect(exponential(10, 5)).toBe(10);
    });

    it('should produce deterministic results with SeededRandom', () => {
      const rng1 = new SeededRandom(42);
      const rng2 = new SeededRandom(42);
      const v1 = exponential(10, 20, rng1);
      const v2 = exponential(10, 20, rng2);
      expect(v1).toBe(v2);
    });
  });

  describe('normal', () => {
    it('should return values within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const v = normal(10, 20);
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('burst', () => {
    it('should return values within bounds', () => {
      for (let i = 0; i < 100; i++) {
        const v = burst(10, 20);
        expect(v).toBeGreaterThanOrEqual(10);
        expect(v).toBeLessThanOrEqual(20);
      }
    });

    it('should use custom threshold', () => {
      const v = burst(10, 20, undefined, 0.0);
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(20);
    });
  });

  describe('sampleDistribution', () => {
    it('should sample uniform', () => {
      const v = sampleDistribution({ type: 'uniform', min: 0, max: 10 });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    });

    it('should sample exponential', () => {
      const v = sampleDistribution({ type: 'exponential', min: 5, max: 15 });
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    });

    it('should sample normal', () => {
      const v = sampleDistribution({ type: 'normal', min: 5, max: 15 });
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    });

    it('should sample burst', () => {
      const v = sampleDistribution({ type: 'burst', min: 5, max: 15 });
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThanOrEqual(15);
    });

    it('should default to uniform for unknown type', () => {
      const v = sampleDistribution({
        type: 'unknown' as 'uniform',
        min: 0,
        max: 10,
      });
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    });
  });
});
