import type { RandomSource } from '../utils/RandomSource.js';

import type { Scenario } from './scenario.js';

export type EngineMode = 'passthrough' | 'inject' | 'record';

export interface ChaosEngineConfig {
  scenarios?: Scenario[];
  mode?: EngineMode;
  middlewareTimeout?: number;
  observability?: ObservabilityConfig;
  randomSource?: RandomSource;
}

export interface ObservabilityConfig {
  logging?: LoggingConfig;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  format: 'json' | 'text';
  destination?: string;
}
