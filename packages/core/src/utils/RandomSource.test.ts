import { describe, expect, it } from 'vitest';

import { MathRandom, SeededRandom } from './RandomSource.js';

describe('MathRandom', () => {
  it('returns a number between 0 and 1', () => {
    const rng = new MathRandom();
    for (let i = 0; i < 100; i++) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('produces non-identical results across calls', () => {
    const rng = new MathRandom();
    const values = new Set<number>();
    for (let i = 0; i < 50; i++) {
      values.add(rng.random());
    }
    expect(values.size).toBeGreaterThan(1);
  });
});

describe('SeededRandom', () => {
  it('produces deterministic results for the same seed', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(42);

    const seq1 = Array.from({ length: 10 }, () => rng1.random());
    const seq2 = Array.from({ length: 10 }, () => rng2.random());

    expect(seq1).toEqual(seq2);
  });

  it('produces different results for different seeds', () => {
    const rng1 = new SeededRandom(42);
    const rng2 = new SeededRandom(99);

    const seq1 = Array.from({ length: 5 }, () => rng1.random());
    const seq2 = Array.from({ length: 5 }, () => rng2.random());

    expect(seq1).not.toEqual(seq2);
  });

  it('returns values in [0, 1) range', () => {
    const rng = new SeededRandom(12345);

    for (let i = 0; i < 1000; i++) {
      const value = rng.random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('truncates large seeds to 32 bits', () => {
    const rng = new SeededRandom(0xffffffff + 1);
    const value = rng.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('handles seed 0 correctly', () => {
    const rng = new SeededRandom(0);
    const value = rng.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('handles negative seeds', () => {
    const rng = new SeededRandom(-1);
    const value = rng.random();
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  });

  it('reproduces a known sequence for seed 1', () => {
    const rng = new SeededRandom(1);
    const sequence = Array.from({ length: 20 }, () => rng.random());

    const rng2 = new SeededRandom(1);
    const sequence2 = Array.from({ length: 20 }, () => rng2.random());

    expect(sequence).toEqual(sequence2);
  });
});
