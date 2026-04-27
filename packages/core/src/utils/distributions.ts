import { MathRandom, type RandomSource } from './RandomSource.js';

export type DistributionType = 'uniform' | 'exponential' | 'normal' | 'burst';

export interface DistributionConfig {
  type: DistributionType;
  min: number;
  max: number;
  threshold?: number;
}

export function sampleDistribution(config: DistributionConfig, random?: RandomSource): number {
  const rng = random ?? new MathRandom();
  switch (config.type) {
    case 'uniform':
      return uniform(config.min, config.max, rng);
    case 'exponential':
      return exponential(config.min, config.max, rng);
    case 'normal':
      return normal(config.min, config.max, rng);
    case 'burst':
      return burst(config.min, config.max, rng, config.threshold);
    default:
      return uniform(config.min, config.max, rng);
  }
}

export function uniform(min: number, max: number, random?: RandomSource): number {
  const rng = random ?? new MathRandom();
  return rng.random() * (max - min) + min;
}

export function exponential(min: number, max: number, random?: RandomSource): number {
  const rng = random ?? new MathRandom();
  if (max <= min) return min;
  const lambda = 1 / (max - min);
  return Math.min(max, Math.max(min, min - Math.log(1 - rng.random()) / lambda));
}

export function normal(min: number, max: number, random?: RandomSource): number {
  const rng = random ?? new MathRandom();
  const mean = (min + max) / 2;
  const stdDev = (max - min) / 4;
  const z = boxMuller(rng);
  return Math.max(min, Math.min(max, mean + z * stdDev));
}

export function burst(min: number, max: number, random?: RandomSource, threshold?: number): number {
  const rng = random ?? new MathRandom();
  const t = threshold ?? 0.8;
  if (rng.random() < t) {
    return min;
  }
  return uniform(min, max, rng);
}

function boxMuller(random: RandomSource): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = random.random();
  while (v === 0) v = random.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
