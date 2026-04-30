import type { FaultCondition } from '../types/index.js';

export interface TemporalWindow {
  startHour: number;
  endHour: number;
  daysOfWeek?: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export class TemporalScheduler {
  private errorCounts: Map<string, { total: number; errors: number }> = new Map();

  evaluateCondition(
    condition: FaultCondition,
    context: { toolName: string; callCount: number },
  ): boolean {
    switch (condition.type) {
      case 'timeWindow':
        return this.evaluateTimeWindow(condition.config);
      case 'callCount':
        return this.evaluateCallCount(condition.config, context);
      case 'errorRate':
        return this.evaluateErrorRate(condition.config, context.toolName);
      default: {
        const _exhaustive: never = condition.type;
        void _exhaustive;
        return false;
      }
    }
  }

  private evaluateTimeWindow(config: Record<string, unknown>): boolean {
    const startHour = Number(config.startHour ?? 0);
    const endHour = Number(config.endHour ?? 23);
    const daysOfWeek = Array.isArray(config.daysOfWeek)
      ? (config.daysOfWeek as number[])
      : undefined;

    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    if (startHour <= endHour) {
      if (hour < startHour || hour > endHour) return false;
    } else {
      if (hour < startHour && hour > endHour) return false;
    }

    if (daysOfWeek && !daysOfWeek.includes(day)) {
      return false;
    }

    return true;
  }

  private evaluateCallCount(
    config: Record<string, unknown>,
    context: { toolName: string; callCount: number },
  ): boolean {
    const minCalls = Number(config.minCalls ?? 0);
    const maxCalls = Number(config.maxCalls ?? Number.POSITIVE_INFINITY);
    const count = context.callCount;

    return count >= minCalls && count <= maxCalls;
  }

  private evaluateErrorRate(config: Record<string, unknown>, toolName: string): boolean {
    const minRate = Number(config.minRate ?? 0);
    const maxRate = Number(config.maxRate ?? 1);
    const stats = this.errorCounts.get(toolName);

    if (!stats || stats.total === 0) {
      return minRate === 0;
    }

    const rate = stats.errors / stats.total;
    return rate >= minRate && rate <= maxRate;
  }

  recordCall(toolName: string, hadError: boolean): void {
    const stats = this.errorCounts.get(toolName) ?? { total: 0, errors: 0 };
    stats.total++;
    if (hadError) stats.errors++;
    this.errorCounts.set(toolName, stats);
  }

  reset(): void {
    this.errorCounts.clear();
  }
}
