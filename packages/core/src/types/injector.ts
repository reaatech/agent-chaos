import type { RandomSource } from '../utils/RandomSource.js';

import type { ToolCall, ToolError, ToolResponse } from './events.js';
import type { FaultConfig, Scenario } from './scenario.js';

export interface Injector {
  readonly type: FaultConfig['type'];

  canInject(fault: FaultConfig, context: InjectionContext): boolean;

  inject(fault: FaultConfig, context: InjectionContext): Promise<InjectionResult>;

  resetCallCount?(): void;
}

export interface InjectionContext {
  toolCall: ToolCall;
  scenario: Scenario;
  previousCalls: ToolCall[];
  previousResponses: ToolResponse[];
  randomSource: RandomSource;
}

export interface InjectionResult {
  shouldInject: boolean;
  mockResponse?: ToolResponse;
  error?: ToolError;
}
