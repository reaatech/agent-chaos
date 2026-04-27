import type { PartialFailureConfig } from '../types/faults.js';
import type {
  FaultConfig,
  Injector,
  InjectionContext,
  InjectionResult,
  ToolResponse,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { PartialFailureConfig };

export class PartialFailureInjector implements Injector {
  public readonly type = 'partialFailure' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: PartialFailureConfig): boolean {
    return typeof config === 'object' && config !== null;
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'partialFailure') return false;

    const config = fault.config;
    if (!this.isValidConfig(config)) return false;

    if (config.failureRate !== undefined && (config.failureRate < 0 || config.failureRate > 1)) {
      this.logger.warn('Invalid failureRate value', { failureRate: config.failureRate });
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'partialFailure') return { shouldInject: false };

    const config = fault.config;

    const failureRate = config.failureRate ?? 0.5;
    if (context.randomSource.random() > failureRate) {
      return { shouldInject: false };
    }

    const errorTypes = config.errorTypes ?? ['connectionRefused', 'queryTimeout', 'partialData'];
    const errorType = errorTypes[Math.floor(context.randomSource.random() * errorTypes.length)];

    this.logger.info('Injecting partial failure', {
      tool: context.toolCall.name,
      errorType,
      failureRate,
    });

    if (config.degradedResult) {
      const mockResponse: ToolResponse = {
        id: context.toolCall.id,
        toolName: context.toolCall.name,
        result: {
          status: 'degraded',
          data: null,
          partial: true,
          message: `Service degraded due to ${errorType}`,
        },
        error: {
          code: 'PARTIAL_FAILURE',
          message: `Partial failure: ${errorType}`,
          details: {
            errorType,
            failureRate,
            degraded: true,
          },
        },
        duration: context.randomSource.random() * 500,
        timestamp: Date.now(),
        metadata: {
          partialFailure: true,
          errorType,
          degraded: true,
        },
      };

      return {
        shouldInject: true,
        mockResponse,
      };
    }

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: null,
      error: {
        code: 'PARTIAL_FAILURE',
        message: `Partial failure: ${errorType}`,
        details: {
          errorType,
          failureRate,
        },
      },
      duration: context.randomSource.random() * 500,
      timestamp: Date.now(),
      metadata: {
        partialFailure: true,
        errorType,
      },
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }
}
