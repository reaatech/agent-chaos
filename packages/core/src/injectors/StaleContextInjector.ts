import { DEFAULT_STALENESS_SECONDS } from '../constants.js';
import type { StaleContextConfig } from '../types/faults.js';
import type {
  FaultConfig,
  Injector,
  InjectionContext,
  InjectionResult,
  ToolResponse,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { StaleContextConfig };

export class StaleContextInjector implements Injector {
  public readonly type = 'staleContext' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: StaleContextConfig): boolean {
    return typeof config === 'object' && config !== null;
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'staleContext') return false;

    const config = fault.config;
    if (!this.isValidConfig(config)) return false;

    if (config.stalenessSeconds !== undefined && config.stalenessSeconds < 0) {
      this.logger.warn('Invalid stalenessSeconds value', {
        stalenessSeconds: config.stalenessSeconds,
      });
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'staleContext') return { shouldInject: false };

    const config = fault.config;

    const stalenessSeconds = config.stalenessSeconds ?? DEFAULT_STALENESS_SECONDS;
    const staleTimestamp = Date.now() - stalenessSeconds * 1000;

    this.logger.info('Injecting stale context', {
      tool: context.toolCall.name,
      stalenessSeconds,
    });

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: {
        status: 'success',
        data: context.toolCall.arguments,
        cached: !config.markAsFresh,
        cachedAt: staleTimestamp,
      },
      duration: context.randomSource.random() * 10,
      timestamp: Date.now(),
      metadata: {
        staleContext: true,
        stalenessSeconds,
        cachedAt: staleTimestamp,
      },
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }
}
