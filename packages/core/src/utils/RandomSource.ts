export interface RandomSource {
  random(): number;
}

export class MathRandom implements RandomSource {
  random(): number {
    return Math.random();
  }
}

/**
 * Deterministic PRNG using the Mulberry32 algorithm.
 * Seed with a 32-bit integer for reproducible sequences.
 * Seeds larger than 2^32 are truncated to 32 bits.
 */
export class SeededRandom implements RandomSource {
  private state: number;

  constructor(seed: number) {
    const truncated = seed | 0;
    if (seed !== truncated) {
      globalThis.console.warn(
        `SeededRandom: seed ${seed} exceeds 32-bit range, truncated to ${truncated}`,
      );
    }
    this.state = truncated;
  }

  random(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
