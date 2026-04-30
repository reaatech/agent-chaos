import { describe, expect, it } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { StaleContextInjector } from './StaleContextInjector.js';

describe('StaleContextInjector', () => {
  const injector = new StaleContextInjector();
  const context: InjectionContext = {
    toolCall: {
      id: '1',
      name: 'testTool',
      arguments: { query: 'weather' },
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
        type: 'staleContext',
        config: { stalenessSeconds: 3600 },
      };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for negative stalenessSeconds', () => {
      const fault: FaultConfig = {
        type: 'staleContext',
        config: { stalenessSeconds: -1 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should return stale context response', async () => {
      const fault: FaultConfig = {
        type: 'staleContext',
        config: { stalenessSeconds: 7200 },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse).toBeDefined();
      const r = result.mockResponse?.result as Record<string, unknown>;
      expect(r.cached).toBe(true);
      expect(r.cachedAt).toBeDefined();
    });

    it('should mark as fresh when configured', async () => {
      const fault: FaultConfig = {
        type: 'staleContext',
        config: { stalenessSeconds: 3600, markAsFresh: true },
      };
      const result = await injector.inject(fault, context);

      const r = result.mockResponse?.result as Record<string, unknown>;
      expect(r.cached).toBe(false);
    });

    it('should use default stalenessSeconds when not specified', async () => {
      const fault: FaultConfig = { type: 'staleContext', config: {} };
      const result = await injector.inject(fault, context);

      expect(result.mockResponse?.metadata?.stalenessSeconds).toBeDefined();
    });
  });
});
