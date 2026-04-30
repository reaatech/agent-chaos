import { describe, expect, it } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { MalformedOutputInjector } from './MalformedOutputInjector.js';

describe('MalformedOutputInjector', () => {
  const injector = new MalformedOutputInjector();
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
        type: 'malformedOutput',
        config: { patterns: ['truncated'] },
      };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return true with empty config', () => {
      const fault: FaultConfig = { type: 'malformedOutput', config: {} };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for empty patterns array', () => {
      const fault: FaultConfig = {
        type: 'malformedOutput',
        config: { patterns: [] },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should inject truncated output', async () => {
      const fault: FaultConfig = {
        type: 'malformedOutput',
        config: { patterns: ['truncated'] },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse).toBeDefined();
      expect(typeof result.mockResponse?.result).toBe('string');
      expect(result.mockResponse?.metadata).toMatchObject({
        malformed: true,
        pattern: 'truncated',
      });
    });

    it('should inject invalid json', async () => {
      const fault: FaultConfig = {
        type: 'malformedOutput',
        config: { patterns: ['invalidJson'] },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(typeof result.mockResponse?.result).toBe('string');
    });

    it('should inject missing fields', async () => {
      const fault: FaultConfig = {
        type: 'malformedOutput',
        config: { patterns: ['missingFields'], severity: 'high' },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      expect(result.mockResponse?.result).toEqual({ status: 'partial' });
      expect(result.mockResponse?.metadata).toMatchObject({
        malformed: true,
        pattern: 'missingFields',
        severity: 'high',
      });
    });

    it('should inject wrong type', async () => {
      const fault: FaultConfig = {
        type: 'malformedOutput',
        config: { patterns: ['wrongType'] },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      const r = result.mockResponse?.result;
      expect(
        r === null ||
          typeof r === 'number' ||
          typeof r === 'boolean' ||
          typeof r === 'string' ||
          Array.isArray(r),
      ).toBe(true);
    });

    it('should inject extra fields', async () => {
      const fault: FaultConfig = {
        type: 'malformedOutput',
        config: { patterns: ['extraFields'] },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      const r = result.mockResponse?.result as Record<string, unknown>;
      expect(r._internal).toBeDefined();
    });
  });
});
