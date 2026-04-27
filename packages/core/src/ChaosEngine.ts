import { DEFAULT_MIDDLEWARE_TIMEOUT } from './constants.js';
import type {
  ChaosEngineConfig,
  ToolCall,
  ToolResponse,
  Scenario,
  Injector,
  FaultType,
  ChaosEvent,
  EngineMode,
} from './types/index.js';
import { Logger } from './utils/Logger.js';
import { Middleware } from './Middleware.js';
import { createStandardInjectors } from './injectors/index.js';
import { MathRandom, type RandomSource } from './utils/RandomSource.js';

export class ChaosEngine {
  public mode: EngineMode;
  public scenarios: Scenario[] = [];
  public injectors: Map<FaultType, Injector> = new Map();
  public randomSource: RandomSource;

  private logger: Logger;
  private middleware: Middleware;
  private events: ChaosEvent[] = [];

  constructor(config: ChaosEngineConfig = {}) {
    this.mode = config.mode ?? 'inject';
    this.logger = new Logger(config.observability);
    this.randomSource = config.randomSource ?? new MathRandom();
    this.middleware = new Middleware(this, {
      timeout: config.middlewareTimeout ?? DEFAULT_MIDDLEWARE_TIMEOUT,
      randomSource: this.randomSource,
      logger: this.logger,
    });

    const standardInjectors = createStandardInjectors();
    standardInjectors.forEach((injector) => this.registerInjector(injector));

    if (config.scenarios) {
      config.scenarios.forEach((scenario) => this.loadScenario(scenario));
    }
  }

  loadScenario(scenario: Scenario): void {
    this.scenarios.push(scenario);
    this.logger.info('Scenario loaded', { name: scenario.name });
    this.emitEvent({
      type: 'scenario_loaded',
      timestamp: Date.now(),
      data: { scenarioName: scenario.name },
    });
  }

  unloadScenario(scenarioName: string): void {
    const index = this.scenarios.findIndex((s) => s.name === scenarioName);
    if (index !== -1) {
      this.scenarios.splice(index, 1);
      this.logger.info('Scenario unloaded', { name: scenarioName });
      this.emitEvent({
        type: 'scenario_unloaded',
        timestamp: Date.now(),
        data: { scenarioName },
      });
    }
  }

  setMode(mode: EngineMode): void {
    this.mode = mode;
    this.logger.info('Engine mode changed', { mode });
  }

  async intercept(call: ToolCall): Promise<ToolResponse> {
    if (this.mode === 'passthrough') {
      return this.passthrough(call);
    }

    if (this.mode === 'record') {
      const response = await this.passthrough(call);
      this.emitEvent({
        type: 'tool_called',
        timestamp: Date.now(),
        data: { tool: call.name, arguments: call.arguments, response },
      });
      return response;
    }

    return this.middleware.execute(call, this.scenarios);
  }

  registerInjector(injector: Injector): void {
    this.injectors.set(injector.type, injector);
    this.logger.debug('Injector registered', { type: injector.type });
  }

  record(): ChaosEvent[] {
    return [...this.events];
  }

  reset(): void {
    this.events = [];
    this.middleware.clearCallHistory();

    for (const injector of this.injectors.values()) {
      injector.resetCallCount?.();
    }

    this.logger.info('Engine reset');
  }

  private passthrough(call: ToolCall): Promise<ToolResponse> {
    return Promise.resolve({
      id: call.id,
      toolName: call.name,
      result: null,
      duration: 0,
      timestamp: Date.now(),
    });
  }

  emitEvent(event: ChaosEvent): void {
    this.events.push(event);
    this.logger.debug('Event emitted', { type: event.type });
  }
}

export function createChaosEngine(config: ChaosEngineConfig = {}): ChaosEngine {
  return new ChaosEngine(config);
}
