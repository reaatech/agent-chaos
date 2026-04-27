import { DEFAULT_RETRY_AFTER } from '../constants.js';
import type { RateLimitConfig } from '../types/faults.js';
import type {
  FaultConfig,
  Injector,
  InjectionContext,
  InjectionResult,
  ToolResponse,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { RateLimitConfig };

export class RateLimitInjector implements Injector {
  public readonly type = 'rateLimit' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: RateLimitConfig): boolean {
    return typeof config === 'object' && config !== null;
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'rateLimit') return false;

    const config = fault.config;
    if (!this.isValidConfig(config)) return false;

    if (config.retryAfter !== undefined && config.retryAfter < 0) {
      this.logger.warn('Invalid retryAfter value', { retryAfter: config.retryAfter });
      return false;
    }
    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'rateLimit') return { shouldInject: false };

    const config = fault.config;

    const retryAfter = config.retryAfter ?? DEFAULT_RETRY_AFTER;

    this.logger.info('Injecting rate limit', {
      tool: context.toolCall.name,
      retryAfter,
    });

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: null,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: config.message ?? 'Rate limit exceeded. Please retry later.',
        details: {
          retryAfter,
          tool: context.toolCall.name,
          timestamp: Date.now(),
        },
      },
      duration: 0,
      timestamp: Date.now(),
      metadata: config.includeHeaders
        ? {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': '100',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + retryAfter * 1000),
          }
        : undefined,
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }
}
