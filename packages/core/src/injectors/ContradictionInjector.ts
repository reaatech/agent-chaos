import type { ContradictionConfig } from '../types/faults.js';
import type {
  FaultConfig,
  Injector,
  InjectionContext,
  InjectionResult,
  ToolResponse,
} from '../types/index.js';
import { Logger } from '../utils/Logger.js';

export type { ContradictionConfig };

export class ContradictionInjector implements Injector {
  public readonly type = 'contradiction' as const;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
  }

  private isValidConfig(config: ContradictionConfig): boolean {
    return typeof config === 'object' && config !== null;
  }

  canInject(fault: FaultConfig, _context: InjectionContext): boolean {
    if (fault.type !== 'contradiction') return false;

    const config = fault.config;
    if (!this.isValidConfig(config)) return false;

    if (!config.conflicts || config.conflicts.length === 0) {
      this.logger.warn('No conflicts specified for contradiction injection');
      return false;
    }

    for (const conflict of config.conflicts) {
      if (!conflict.values || conflict.values.length < 2) {
        this.logger.warn('Contradiction conflict needs at least 2 values', {
          field: conflict.field,
        });
        return false;
      }
    }

    return true;
  }

  async inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult> {
    if (fault.type !== 'contradiction') return { shouldInject: false };

    const config = fault.config;

    const conflicts = config.conflicts ?? [];

    this.logger.info('Injecting contradictory result', {
      tool: context.toolCall.name,
      conflictCount: conflicts.length,
    });

    const contradictoryResult: Record<string, unknown> = {};

    for (const conflict of conflicts) {
      const value =
        conflict.values[Math.floor(context.randomSource.random() * conflict.values.length)];
      contradictoryResult[conflict.field] = value;
    }

    const mockResponse: ToolResponse = {
      id: context.toolCall.id,
      toolName: context.toolCall.name,
      result: {
        status: 'success',
        ...contradictoryResult,
      },
      duration: context.randomSource.random() * 50,
      timestamp: Date.now(),
      metadata: {
        contradiction: true,
        conflicts: conflicts.map((c) => c.field),
      },
    };

    return {
      shouldInject: true,
      mockResponse,
    };
  }
}
