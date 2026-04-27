import type { TimeoutConfig } from '../types/faults.js';
import type {
  FaultConfig,
  Injector,
  InjectionContext,
  InjectionResult,
  ToolError,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { TimeoutConfig };

export class TimeoutInjector implements Injector {
  public readonly type = 'timeout' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: TimeoutConfig): boolean {
    return typeof config.timeout === 'number' && !Number.isNaN(config.timeout);
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'timeout') return false;

    if (!this.isValidConfig(fault.config)) {
      this.logger.warn('Invalid timeout configuration', { config: fault.config });
      return false;
    }

    if (fault.config.timeout < 0) {
      this.logger.warn('Invalid timeout configuration', { config: fault.config });
      return false;
    }
    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'timeout') return { shouldInject: false };

    const config = fault.config;
    const timeoutMs = config.timeout;

    this.logger.info('Injecting timeout', {
      tool: context.toolCall.name,
      timeout: timeoutMs,
    });

    const error: ToolError = {
      code: 'TIMEOUT',
      message: config.message ?? `Request timed out after ${timeoutMs}ms`,
      details: {
        timeout: timeoutMs,
        tool: context.toolCall.name,
        timestamp: Date.now(),
      },
    };

    return {
      shouldInject: true,
      error,
    };
  }
}
