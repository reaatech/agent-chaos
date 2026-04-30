import type { MalformedOutputConfig } from '../types/faults.js';
import type {
  FaultConfig,
  InjectionContext,
  InjectionResult,
  Injector,
  ToolResponse,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { MalformedOutputConfig };

export class MalformedOutputInjector implements Injector {
  public readonly type = 'malformedOutput' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: MalformedOutputConfig): boolean {
    return typeof config === 'object' && config !== null;
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'malformedOutput') return false;

    const config = fault.config;
    if (!this.isValidConfig(config)) return false;

    if (config.patterns && config.patterns.length === 0) {
      this.logger.warn('No malformed output patterns specified');
      return false;
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'malformedOutput') return { shouldInject: false };

    const config = fault.config;

    const patterns = config.patterns ?? ['truncated', 'invalidJson', 'missingFields'];
    const severity = config.severity ?? 'medium';
    const pattern = patterns[Math.floor(context.randomSource.random() * patterns.length)];

    this.logger.info('Injecting malformed output', {
      tool: context.toolCall.name,
      pattern,
      severity,
    });

    const severityMultiplier: Record<string, number> = {
      low: 0.3,
      medium: 0.6,
      high: 1.0,
    };
    const corruptionFactor = severityMultiplier[severity] ?? 0.6;

    let malformedResult: unknown;

    switch (pattern) {
      case 'truncated':
        malformedResult = this.generateTruncatedOutput(context, corruptionFactor);
        break;
      case 'invalidJson':
        malformedResult = this.generateInvalidJson(context);
        break;
      case 'missingFields':
        malformedResult = this.generateMissingFields(corruptionFactor);
        break;
      case 'wrongType':
        malformedResult = this.generateWrongType(context);
        break;
      case 'extraFields':
        malformedResult = this.generateExtraFields();
        break;
      default:
        malformedResult = { error: 'Unknown malformed pattern' };
    }

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: malformedResult,
      duration: context.randomSource.random() * 100 * corruptionFactor,
      timestamp: Date.now(),
      metadata: {
        malformed: true,
        pattern,
        severity,
      },
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }

  private generateTruncatedOutput(context: InjectionContext, corruptionFactor: number): string {
    const complete = '{"status": "success", "data": {"items": [1, 2, 3, 4, 5]}}';
    const truncatePoint = Math.floor(
      context.randomSource.random() * complete.length * corruptionFactor,
    );
    return complete.substring(0, Math.max(1, truncatePoint));
  }

  private generateInvalidJson(context: InjectionContext): string {
    const invalidJsons = [
      '{key: "value"}',
      '{"key": "value",}',
      '{"key": undefined}',
      '{key: "value"',
      '["item1", "item2",]',
    ];
    return invalidJsons[Math.floor(context.randomSource.random() * invalidJsons.length)];
  }

  private generateMissingFields(corruptionFactor: number): Record<string, unknown> {
    if (corruptionFactor >= 1.0) {
      return { status: 'partial' };
    }
    return { status: 'partial', id: 'incomplete', timestamp: Date.now() };
  }

  private generateWrongType(context: InjectionContext): unknown {
    const wrongTypes: unknown[] = [null, 42, true, 'just a string instead of object', []];
    return wrongTypes[Math.floor(context.randomSource.random() * wrongTypes.length)];
  }

  private generateExtraFields(): Record<string, unknown> {
    return {
      status: 'success',
      data: { items: [1, 2, 3] },
      _internal: 'should not be here',
    };
  }
}
