import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { LatencyInjector } from './LatencyInjector.js';

describe('LatencyInjector', () => {
  let injector: LatencyInjector;

  beforeEach(() => {
    injector = new LatencyInjector();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const context: InjectionContext = {
    toolCall: {
      id: '1',
      name: 'testTool',
      arguments: {},
      timestamp: Date.now(),
    },
    scenario: { name: 'test', targets: [] },
    previousCalls: [],
    previousResponses: [],
    randomSource: new MathRandom(),
  };

  describe('canInject', () => {
    it('should return true for valid config', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 100, maxDelay: 200 },
      };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for missing minDelay', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: undefined as unknown as number, maxDelay: 200 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false for missing maxDelay', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 100, maxDelay: undefined as unknown as number },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false when both delays are negative', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: -1, maxDelay: -1 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false for negative delay', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: -1, maxDelay: 200 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false when minDelay > maxDelay', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 200, maxDelay: 100 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should inject delay within bounds', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 50, maxDelay: 100 },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(100);
      const result = await promise;

      expect(result.shouldInject).toBe(true);
    });

    it('should respect zero delay', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 0, maxDelay: 0 },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(0);
      const result = await promise;
      expect(result.shouldInject).toBe(true);
    });

    it('should inject with exponential distribution', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 0, maxDelay: 10, distribution: 'exponential' },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(50);
      const result = await promise;
      expect(result.shouldInject).toBe(true);
    });

    it('should inject with normal distribution', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 0, maxDelay: 10, distribution: 'normal' },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(50);
      const result = await promise;
      expect(result.shouldInject).toBe(true);
    });

    it('should default to uniform for unknown distribution', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: {
          minDelay: 0,
          maxDelay: 10,
          distribution: 'unknown' as 'uniform',
        },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(50);
      const result = await promise;
      expect(result.shouldInject).toBe(true);
    });

    it('should inject with burst distribution', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 0, maxDelay: 10, distribution: 'burst' },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(50);
      const result = await promise;
      expect(result.shouldInject).toBe(true);
    });

    it('should return minDelay when minDelay equals maxDelay', async () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: 50, maxDelay: 50 },
      };
      const promise = injector.inject(fault, context);
      vi.advanceTimersByTime(50);
      const result = await promise;
      expect(result.shouldInject).toBe(true);
    });

    it('should return false for wrong fault type', async () => {
      const fault: FaultConfig = { type: 'timeout', config: { timeout: 100 } };
      const result = await injector.inject(fault, context);
      expect(result.shouldInject).toBe(false);
    });

    it('should reject NaN values in config', () => {
      const fault: FaultConfig = {
        type: 'latency',
        config: { minDelay: Number.NaN, maxDelay: 200 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });
});
