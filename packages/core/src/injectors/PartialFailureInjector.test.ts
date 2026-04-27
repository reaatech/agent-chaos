import { describe, it, expect } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { PartialFailureInjector } from './PartialFailureInjector.js';

describe('PartialFailureInjector', () => {
  const injector = new PartialFailureInjector();
  const context: InjectionContext = {
    toolCall: { id: '1', name: 'testTool', arguments: {}, timestamp: Date.now() },
    scenario: { name: 'test', targets: [] },
    previousCalls: [],
    previousResponses: [],
    randomSource: new MathRandom(),
  };

  describe('canInject', () => {
    it('should return true for valid config', () => {
      const fault: FaultConfig = { type: 'partialFailure', config: { failureRate: 0.3 } };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for negative failureRate', () => {
      const fault: FaultConfig = { type: 'partialFailure', config: { failureRate: -0.1 } };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false for failureRate > 1', () => {
      const fault: FaultConfig = { type: 'partialFailure', config: { failureRate: 1.5 } };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should return partial failure error', async () => {
      const fault: FaultConfig = {
        type: 'partialFailure',
        config: { failureRate: 1.0 },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse?.error?.code).toBe('PARTIAL_FAILURE');
    });

    it('should return degraded result when configured', async () => {
      const fault: FaultConfig = {
        type: 'partialFailure',
        config: { degradedResult: true, failureRate: 1.0 },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      const r = result.mockResponse?.result as Record<string, unknown>;
      expect(r.status).toBe('degraded');
      expect(r.partial).toBe(true);
    });

    it('should use custom error types', async () => {
      const fault: FaultConfig = {
        type: 'partialFailure',
        config: { errorTypes: ['customError'], failureRate: 1.0 },
      };
      const result = await injector.inject(fault, context);

      expect(result.mockResponse?.metadata).toMatchObject({ errorType: 'customError' });
    });

    it('should not inject when failureRate is 0', async () => {
      const fault: FaultConfig = { type: 'partialFailure', config: { failureRate: 0 } };
      const result = await injector.inject(fault, context);
      expect(result.shouldInject).toBe(false);
    });

    it('should produce non-degraded result when degradedResult is false', async () => {
      const fault: FaultConfig = {
        type: 'partialFailure',
        config: { failureRate: 1.0, degradedResult: false },
      };
      const result = await injector.inject(fault, context);
      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse?.result).toBeNull();
    });
  });
});
