import { describe, it, expect } from 'vitest';

import type { FaultConfig, InjectionContext } from '../types/index.js';
import { MathRandom } from '../utils/RandomSource.js';

import { ContradictionInjector } from './ContradictionInjector.js';

describe('ContradictionInjector', () => {
  const injector = new ContradictionInjector();
  const context: InjectionContext = {
    toolCall: { id: '1', name: 'testTool', arguments: {}, timestamp: Date.now() },
    scenario: { name: 'test', targets: [] },
    previousCalls: [],
    previousResponses: [],
    randomSource: new MathRandom(),
  };

  describe('canInject', () => {
    it('should return true for valid config', () => {
      const fault: FaultConfig = {
        type: 'contradiction',
        config: { conflicts: [{ field: 'temperature', values: [72, 45] }] },
      };
      expect(injector.canInject(fault, context)).toBe(true);
    });

    it('should return false for empty conflicts', () => {
      const fault: FaultConfig = { type: 'contradiction', config: { conflicts: [] } };
      expect(injector.canInject(fault, context)).toBe(false);
    });

    it('should return false for conflicts with less than 2 values', () => {
      const fault: FaultConfig = {
        type: 'contradiction',
        config: { conflicts: [{ field: 'temp', values: [72] }] },
      };
      expect(injector.canInject(fault, context)).toBe(false);
    });
  });

  describe('inject', () => {
    it('should return contradictory result', async () => {
      const fault: FaultConfig = {
        type: 'contradiction',
        config: {
          conflicts: [
            { field: 'temperature', values: [72, 45, 98] },
            { field: 'conditions', values: ['sunny', 'rainy'] },
          ],
        },
      };
      const result = await injector.inject(fault, context);

      expect(result.shouldInject).toBe(true);
      const r = result.mockResponse?.result as Record<string, unknown>;
      expect(r.temperature).toBeDefined();
      expect([72, 45, 98]).toContain(r.temperature);
      expect(['sunny', 'rainy']).toContain(r.conditions);
    });

    it('should include metadata', async () => {
      const fault: FaultConfig = {
        type: 'contradiction',
        config: { conflicts: [{ field: 'x', values: [1, 2] }] },
      };
      const result = await injector.inject(fault, context);

      expect(result.mockResponse?.metadata).toMatchObject({
        contradiction: true,
        conflicts: ['x'],
      });
    });
  });
});
