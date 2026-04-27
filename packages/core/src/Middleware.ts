import type {
  ToolCall,
  ToolResponse,
  Scenario,
  FaultConfig,
  InjectionContext,
} from './types/index.js';
import type { ChaosEngine } from './ChaosEngine.js';
import { DEFAULT_PROBABILITY, MAX_CALL_HISTORY } from './constants.js';
import { Logger } from './utils/Logger.js';
import { matchSelector } from './utils/selector.js';
import { TemporalScheduler } from './utils/TemporalScheduler.js';
import { MathRandom, type RandomSource } from './utils/RandomSource.js';

export interface MiddlewareConfig {
  timeout?: number;
  randomSource?: RandomSource;
  logger?: Logger;
}

export interface MiddlewareContext {
  call: ToolCall;
  previousCalls: ToolCall[];
  previousResponses: ToolResponse[];
}

interface ApplicableFault {
  fault: FaultConfig;
  scenario: Scenario;
}

export class Middleware {
  private engine: ChaosEngine;
  private logger: Logger;
  private callHistory: { call: ToolCall; response: ToolResponse }[] = [];
  private timeout: number;
  private scheduler: TemporalScheduler;
  private perToolCallCounts: Map<string, number> = new Map();
  private random: RandomSource;

  constructor(engine: ChaosEngine, config: MiddlewareConfig = {}) {
    this.engine = engine;
    this.logger = config.logger ?? new Logger();
    this.timeout = config.timeout ?? 0;
    this.random = config.randomSource ?? new MathRandom();
    this.scheduler = new TemporalScheduler();
  }

  async execute(call: ToolCall, scenarios: Scenario[]): Promise<ToolResponse> {
    const startTime = Date.now();
    this.incrementCallCount(call.name);

    const abortController = new AbortController();

    const executeInternal = async (): Promise<ToolResponse> => {
      const context: MiddlewareContext = {
        call,
        previousCalls: this.callHistory.map((h) => h.call),
        previousResponses: this.callHistory.map((h) => h.response),
      };

      try {
        if (abortController.signal.aborted) return this.timeoutResponse(call, startTime);

        const applicable = this.findApplicableFaults(call.name, scenarios);

        if (applicable.length === 0) {
          return this.passthrough(call, startTime);
        }

        const selected = this.selectFault(applicable);

        if (!selected) {
          return this.passthrough(call, startTime);
        }

        const { fault: selectedFault, scenario: selectedScenario } = selected;
        const injector = this.engine.injectors.get(selectedFault.type);
        if (!injector) {
          this.logger.warn('No injector found for fault type', { type: selectedFault.type });
          return this.passthrough(call, startTime);
        }

        const injectionContext: InjectionContext = {
          toolCall: call,
          scenario: selectedScenario,
          previousCalls: context.previousCalls,
          previousResponses: context.previousResponses,
          randomSource: this.random,
        };

        if (!injector.canInject(selectedFault, injectionContext)) {
          return this.passthrough(call, startTime);
        }

        const result = await injector.inject(selectedFault, injectionContext);

        if (abortController.signal.aborted) return this.timeoutResponse(call, startTime);

        if (result.shouldInject) {
          const response: ToolResponse = result.mockResponse ?? {
            id: call.id,
            toolName: call.name,
            result: null,
            error: result.error,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          };

          this.recordCall(call, response);
          this.scheduler.recordCall(call.name, response.error !== undefined);
          this.logger.info('Fault injected', {
            tool: call.name,
            faultType: selectedFault.type,
          });
          this.engine.emitEvent({
            type: 'fault_injected',
            timestamp: Date.now(),
            data: { tool: call.name, faultType: selectedFault.type, response },
          });

          return response;
        }

        if (abortController.signal.aborted) return this.timeoutResponse(call, startTime);

        return this.passthrough(call, startTime);
      } catch (error) {
        this.logger.error('Middleware execution failed', {
          tool: call.name,
          error: error instanceof Error ? error.message : error,
        });

        return {
          id: call.id,
          toolName: call.name,
          result: null,
          error: {
            code: 'MIDDLEWARE_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        };
      }
    };

    if (this.timeout > 0) {
      let timedOut = false;
      let timerId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<ToolResponse>((resolve) => {
        timerId = setTimeout(() => {
          timedOut = true;
          abortController.abort();
          resolve({
            id: call.id,
            toolName: call.name,
            result: null,
            error: {
              code: 'MIDDLEWARE_TIMEOUT',
              message: `Middleware execution exceeded ${this.timeout}ms`,
            },
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          });
        }, this.timeout);
      });

      const result = await Promise.race([executeInternal(), timeoutPromise]);
      if (!timedOut && timerId !== undefined) {
        clearTimeout(timerId);
      }
      return result;
    }

    return executeInternal();
  }

  private timeoutResponse(call: ToolCall, startTime: number): ToolResponse {
    return {
      id: call.id,
      toolName: call.name,
      result: null,
      error: {
        code: 'MIDDLEWARE_TIMEOUT',
        message: `Middleware execution exceeded ${this.timeout}ms`,
      },
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }

  private findApplicableFaults(toolName: string, scenarios: Scenario[]): ApplicableFault[] {
    const applicable: ApplicableFault[] = [];
    const callCount = this.perToolCallCounts.get(toolName) ?? 0;

    for (const scenario of scenarios) {
      for (const target of scenario.targets) {
        if (matchSelector(toolName, target.selector)) {
          for (const fault of target.faults) {
            if (this.conditionsPass(fault, toolName, callCount)) {
              applicable.push({ fault, scenario });
            }
          }
        }
      }

      if (scenario.overrides) {
        for (const override of scenario.overrides) {
          if (matchSelector(toolName, override.selector)) {
            for (const fault of override.faults) {
              if (this.conditionsPass(fault, toolName, callCount)) {
                applicable.push({ fault, scenario });
              }
            }
          }
        }
      }
    }

    return applicable;
  }

  private conditionsPass(fault: FaultConfig, toolName: string, callCount: number): boolean {
    if (!fault.conditions || fault.conditions.length === 0) return true;
    for (const condition of fault.conditions) {
      if (!this.scheduler.evaluateCondition(condition, { toolName, callCount })) {
        return false;
      }
    }
    return true;
  }

  private selectFault(applicable: ApplicableFault[]): ApplicableFault | null {
    const resolveProbability = (entry: ApplicableFault): number =>
      entry.fault.probability ?? entry.scenario.defaults?.probability ?? DEFAULT_PROBABILITY;

    const sorted = [...applicable].sort((a, b) => resolveProbability(b) - resolveProbability(a));

    for (const entry of sorted) {
      if (this.random.random() < resolveProbability(entry)) {
        return entry;
      }
    }

    return null;
  }

  private incrementCallCount(toolName: string): void {
    this.perToolCallCounts.set(toolName, (this.perToolCallCounts.get(toolName) ?? 0) + 1);
  }

  private passthrough(call: ToolCall, startTime: number): ToolResponse {
    const response: ToolResponse = {
      id: call.id,
      toolName: call.name,
      result: null,
      duration: Date.now() - startTime,
      timestamp: Date.now(),
    };

    this.recordCall(call, response);
    return response;
  }

  private recordCall(call: ToolCall, response: ToolResponse): void {
    this.callHistory.push({ call, response });

    if (this.callHistory.length > MAX_CALL_HISTORY) {
      this.callHistory.splice(0, this.callHistory.length - MAX_CALL_HISTORY);
    }
  }

  getCallHistory(): { call: ToolCall; response: ToolResponse }[] {
    return [...this.callHistory];
  }

  clearCallHistory(): void {
    this.callHistory = [];
    this.perToolCallCounts.clear();
    this.scheduler.reset();
  }
}
