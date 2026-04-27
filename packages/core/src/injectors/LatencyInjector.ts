import type { LatencyConfig } from '../types/faults.js';
import type { FaultConfig, Injector, InjectionContext, InjectionResult } from '../types/index.js';
import { sampleDistribution, type DistributionType } from '../utils/distributions.js';
import { Logger } from '../utils/Logger.js';

export type { LatencyConfig };

export class LatencyInjector implements Injector {
  public readonly type = 'latency' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: LatencyConfig): boolean {
    return (
      typeof config.minDelay === 'number' &&
      !Number.isNaN(config.minDelay) &&
      typeof config.maxDelay === 'number' &&
      !Number.isNaN(config.maxDelay)
    );
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'latency') return false;

    if (!this.isValidConfig(fault.config)) {
      this.logger.warn('Invalid latency configuration', { config: fault.config });
      return false;
    }

    if (fault.config.minDelay < 0 || fault.config.maxDelay < 0) {
      this.logger.warn('Negative delay values not allowed', { config: fault.config });
      return false;
    }

    if (fault.config.minDelay > fault.config.maxDelay) {
      this.logger.warn('minDelay cannot be greater than maxDelay', { config: fault.config });
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'latency') return { shouldInject: false };

    const config = fault.config;
    const delay = this.calculateDelay(config, context);

    this.logger.debug('Injecting latency', {
      tool: context.toolCall.name,
      delay,
    });

    await this.sleep(delay);

    return { shouldInject: true };
  }

  private calculateDelay(config: LatencyConfig, context: InjectionContext): number {
    const { minDelay, maxDelay, distribution = 'uniform' } = config;
    if (minDelay === maxDelay) return minDelay;
    return sampleDistribution(
      {
        type: distribution as DistributionType,
        min: minDelay,
        max: maxDelay,
      },
      context.randomSource
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
