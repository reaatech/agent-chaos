import { describe, it, expect, beforeEach } from 'vitest';

import type { FaultCondition } from '../types/index.js';

import { TemporalScheduler } from './TemporalScheduler.js';

describe('TemporalScheduler', () => {
  let scheduler: TemporalScheduler;

  beforeEach(() => {
    scheduler = new TemporalScheduler();
  });

  describe('timeWindow', () => {
    it('should evaluate based on current hour', () => {
      const condition: FaultCondition = {
        type: 'timeWindow',
        config: {
          startHour: 0,
          endHour: 23,
        },
      };

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(true);
    });

    it('should reject when outside time window', () => {
      const now = new Date();
      // Create a window that is impossible to match (next hour to same hour)
      const nextHour = (now.getHours() + 1) % 24;
      const condition: FaultCondition = {
        type: 'timeWindow',
        config: {
          startHour: nextHour,
          endHour: nextHour,
        },
      };

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(false);
    });
  });

  describe('callCount', () => {
    it('should evaluate based on call count', () => {
      const condition: FaultCondition = {
        type: 'callCount',
        config: { minCalls: 2, maxCalls: 5 },
      };

      expect(scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 1 })).toBe(
        false
      );
      expect(scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 3 })).toBe(true);
    });
  });

  describe('errorRate', () => {
    it('should evaluate based on error rate', () => {
      const condition: FaultCondition = {
        type: 'errorRate',
        config: { minRate: 0.1, maxRate: 0.5 },
      };

      scheduler.recordCall('test', true);
      scheduler.recordCall('test', false);

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 2 });
      expect(result).toBe(true);
    });

    it('should return true for zero rate when minRate is 0', () => {
      const condition: FaultCondition = {
        type: 'errorRate',
        config: { minRate: 0, maxRate: 0.5 },
      };

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(true);
    });
  });

  describe('recordCall', () => {
    it('should track calls and errors', () => {
      scheduler.recordCall('tool1', false);
      scheduler.recordCall('tool1', true);
      scheduler.recordCall('tool1', false);

      const condition: FaultCondition = {
        type: 'errorRate',
        config: { minRate: 0.25, maxRate: 0.5 },
      };

      expect(scheduler.evaluateCondition(condition, { toolName: 'tool1', callCount: 3 })).toBe(
        true
      );
    });
  });

  describe('reset', () => {
    it('should clear all tracking', () => {
      scheduler.recordCall('test', true);
      scheduler.reset();

      const condition: FaultCondition = {
        type: 'errorRate',
        config: { minRate: 0.1, maxRate: 1 },
      };

      expect(scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 })).toBe(
        false
      );
    });
  });

  describe('timeWindow crossing midnight', () => {
    it('should accept hour inside overnight window', () => {
      // Test the logic directly: window 22-6, hour 1 should match
      // We can't control the clock, but we can verify the algorithm
      // is correct by checking both possible scenarios
      const now = new Date();
      const hour = now.getHours();
      const isInRange = hour >= 22 || hour <= 6;

      const condition: FaultCondition = {
        type: 'timeWindow',
        config: { startHour: 22, endHour: 6 },
      };
      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(isInRange);
    });
  });

  describe('timeWindow with daysOfWeek', () => {
    it('should reject when day is not in daysOfWeek', () => {
      const today = new Date().getDay();
      const otherDay = (today + 1) % 7;
      const condition: FaultCondition = {
        type: 'timeWindow',
        config: {
          startHour: 0,
          endHour: 23,
          daysOfWeek: [otherDay],
        },
      };

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(false);
    });

    it('should accept when day is in daysOfWeek', () => {
      const today = new Date().getDay();
      const condition: FaultCondition = {
        type: 'timeWindow',
        config: {
          startHour: 0,
          endHour: 23,
          daysOfWeek: [today],
        },
      };

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(true);
    });
  });

  describe('unknown condition type', () => {
    it('should return false for unknown condition', () => {
      const condition: FaultCondition = {
        type: 'unknown' as 'timeWindow',
        config: {},
      };

      const result = scheduler.evaluateCondition(condition, { toolName: 'test', callCount: 0 });
      expect(result).toBe(false);
    });
  });
});
