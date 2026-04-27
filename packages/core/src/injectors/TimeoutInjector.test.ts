import { describe, it, expect } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { TimeoutInjector } from './TimeoutInjector.js';

describe('TimeoutInjector', () => {
  const injector = new TimeoutInjector();
  const context: InjectionContext = {
    toolCall: { id: '1', name: 'testTool', arguments: {}, timestamp: Date.now() },
    scenario: { name: 'test', targets: [] },
    previousCalls: [],
    previousResponses: [],
    randomSource: new MathRandom(),
  };

  describe('canInject', () => {
    it('should return true for valid config', () => {
      const fault: FaultConfig = { type: 'timeout', config: { timeout: 5000 } };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for negative timeout', () => {
      const fault: FaultConfig = { type: 'timeout', config: { timeout: -1 } };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should return timeout error', async () => {
      const fault: FaultConfig = { type: 'timeout', config: { timeout: 5000 } };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('TIMEOUT');
    });

    it('should use custom message', async () => {
      const fault: FaultConfig = {
        type: 'timeout',
        config: { timeout: 1000, message: 'Custom timeout' },
      };
      const result = await injector.inject(fault, context);

      expect(result.error?.message).toBe('Custom timeout');
    });
  });
});
