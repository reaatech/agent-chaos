import { describe, expect, it } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { TokenLimitInjector } from './TokenLimitInjector.js';

describe('TokenLimitInjector', () => {
  const injector = new TokenLimitInjector();
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
        type: 'tokenLimit',
        config: { maxTokens: 4096 },
      };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for negative maxTokens', () => {
      const fault: FaultConfig = {
        type: 'tokenLimit',
        config: { maxTokens: -1 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false for negative remainingTokens', () => {
      const fault: FaultConfig = {
        type: 'tokenLimit',
        config: { remainingTokens: -1 },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should not inject before triggerAfter', async () => {
      const inj = new TokenLimitInjector();
      const fault: FaultConfig = {
        type: 'tokenLimit',
        config: { triggerAfter: 3 },
      };

      const r1 = await inj.inject(fault, context);
      expect(r1.shouldInject).toBe(false);

      const r2 = await inj.inject(fault, context);
      expect(r2.shouldInject).toBe(false);

      const r3 = await inj.inject(fault, context);
      expect(r3.shouldInject).toBe(true);
    });

    it('should return token limit error', async () => {
      const fault: FaultConfig = {
        type: 'tokenLimit',
        config: { remainingTokens: 100, maxTokens: 4096 },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse?.error?.code).toBe('TOKEN_LIMIT_EXCEEDED');
    });

    it('should include suggestions when configured', async () => {
      const fault: FaultConfig = {
        type: 'tokenLimit',
        config: { includeSuggestions: true },
      };
      const result = await injector.inject(fault, context);

      const details = result.mockResponse?.error?.details as Record<string, unknown>;
      expect(details.suggestions).toBeInstanceOf(Array);
    });
  });

  describe('resetCallCount', () => {
    it('should reset call counts', async () => {
      const inj = new TokenLimitInjector();
      const fault: FaultConfig = {
        type: 'tokenLimit',
        config: { triggerAfter: 2 },
      };

      await inj.inject(fault, context);
      await inj.inject(fault, context);

      inj.resetCallCount();

      const result = await inj.inject(fault, context);
      expect(result.shouldInject).toBe(false);
    });
  });
});
