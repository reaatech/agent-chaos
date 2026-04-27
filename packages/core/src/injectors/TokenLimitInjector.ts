import { DEFAULT_REMAINING_TOKENS, DEFAULT_MAX_TOKENS } from '../constants.js';
import type { TokenLimitConfig } from '../types/faults.js';
import type {
  FaultConfig,
  Injector,
  InjectionContext,
  InjectionResult,
  ToolResponse,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { TokenLimitConfig };

export class TokenLimitInjector implements Injector {
  public readonly type = 'tokenLimit' as const;
  private logger: Logger;
  private callCounts: Map<string, number> = new Map();

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: TokenLimitConfig): boolean {
    return typeof config === 'object' && config !== null;
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'tokenLimit') return false;

    const config = fault.config;
    if (!this.isValidConfig(config)) return false;

    if (config.maxTokens !== undefined && config.maxTokens < 0) {
      this.logger.warn('Invalid maxTokens value', { maxTokens: config.maxTokens });
      return false;
    }

    if (config.remainingTokens !== undefined && config.remainingTokens < 0) {
      this.logger.warn('Invalid remainingTokens value', {
        remainingTokens: config.remainingTokens,
      });
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'tokenLimit') return { shouldInject: false };

    const config = fault.config;

    const toolName = context.toolCall.name;
    const callCount = (this.callCounts.get(toolName) ?? 0) + 1;
    this.callCounts.set(toolName, callCount);

    const triggerAfter = config.triggerAfter ?? 1;

    if (callCount < triggerAfter) {
      return { shouldInject: false };
    }

    this.logger.info('Injecting token limit', {
      tool: toolName,
      callCount,
    });

    const remainingTokens = config.remainingTokens ?? DEFAULT_REMAINING_TOKENS;
    const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

    const errorDetails: Record<string, unknown> = {
      remainingTokens,
      maxTokens,
      usedTokens: maxTokens - remainingTokens,
      tool: context.toolCall.name,
    };

    if (config.includeSuggestions) {
      errorDetails.suggestions = [
        'Reduce context window usage',
        'Enable summarization',
        'Split request into smaller chunks',
      ];
    }

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName,
      result: null,
      error: {
        code: 'TOKEN_LIMIT_EXCEEDED',
        message: `Token limit exceeded. ${remainingTokens} tokens remaining out of ${maxTokens}.`,
        details: errorDetails,
      },
      duration: 0,
      timestamp: Date.now(),
      metadata: {
        tokenLimit: true,
        callCount,
      },
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }

  resetCallCount(): void {
    this.callCounts.clear();
  }
}
