import { describe, expect, it } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { RateLimitInjector } from './RateLimitInjector.js';

describe('RateLimitInjector', () => {
  const injector = new RateLimitInjector();
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
        type: 'rateLimit',
        config: { retryAfter: 60 },
      };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for negative retryAfter', () => {
      const fault: FaultConfig = {
        type: 'rateLimit',
        config: { retryAfter: -1 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should return rate limit response', async () => {
      const fault: FaultConfig = {
        type: 'rateLimit',
        config: { retryAfter: 60, includeHeaders: true },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse).toBeDefined();
      expect(result.mockResponse?.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should include headers when configured', async () => {
      const fault: FaultConfig = {
        type: 'rateLimit',
        config: { retryAfter: 120, includeHeaders: true },
      };
      const result = await injector.inject(fault, context);

      expect(result.mockResponse?.metadata).toBeDefined();
      expect(result.mockResponse?.metadata?.['Retry-After']).toBe('120');
    });

    it('should use default retryAfter', async () => {
      const fault: FaultConfig = { type: 'rateLimit', config: {} };
      const result = await injector.inject(fault, context);

      expect(result.mockResponse?.error?.details).toMatchObject({
        retryAfter: 60,
      });
    });

    it('should use custom error message', async () => {
      const fault: FaultConfig = {
        type: 'rateLimit',
        config: { message: 'Custom rate limit message' },
      };
      const result = await injector.inject(fault, context);

      expect(result.mockResponse?.error?.message).toBe('Custom rate limit message');
    });
  });
});
