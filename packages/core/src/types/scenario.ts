import type {
  ContradictionConfig,
  LatencyConfig,
  MalformedOutputConfig,
  PartialFailureConfig,
  RateLimitConfig,
  StaleContextConfig,
  TimeoutConfig,
  TokenLimitConfig,
} from './faults.js';

export interface Scenario {
  name: string;
  description?: string;
  version?: string;
  extends?: string | string[];
  defaults?: ScenarioDefaults;
  targets: TargetConfig[];
  overrides?: OverrideConfig[];
  metadata?: ScenarioMetadata;
}

export interface ScenarioDefaults {
  probability?: number;
  delay?: number;
}

export interface TargetConfig {
  selector: string;
  faults: FaultConfig[];
}

export interface OverrideConfig extends TargetConfig {
  priority?: number;
}

export interface FaultConfigBase {
  probability?: number;
  conditions?: FaultCondition[];
}

export interface LatencyFault extends FaultConfigBase {
  type: 'latency';
  config: LatencyConfig;
}

export interface TimeoutFault extends FaultConfigBase {
  type: 'timeout';
  config: TimeoutConfig;
}

export interface RateLimitFault extends FaultConfigBase {
  type: 'rateLimit';
  config: RateLimitConfig;
}

export interface TokenLimitFault extends FaultConfigBase {
  type: 'tokenLimit';
  config: TokenLimitConfig;
}

export interface MalformedOutputFault extends FaultConfigBase {
  type: 'malformedOutput';
  config: MalformedOutputConfig;
}

export interface StaleContextFault extends FaultConfigBase {
  type: 'staleContext';
  config: StaleContextConfig;
}

export interface ContradictionFault extends FaultConfigBase {
  type: 'contradiction';
  config: ContradictionConfig;
}

export interface PartialFailureFault extends FaultConfigBase {
  type: 'partialFailure';
  config: PartialFailureConfig;
}

export type FaultConfig =
  | LatencyFault
  | TimeoutFault
  | RateLimitFault
  | TokenLimitFault
  | MalformedOutputFault
  | StaleContextFault
  | ContradictionFault
  | PartialFailureFault;

export type FaultType = FaultConfig['type'];

export interface FaultCondition {
  type: 'timeWindow' | 'callCount' | 'errorRate';
  config: Record<string, unknown>;
}

export interface ScenarioMetadata {
  author?: string;
  createdAt?: string;
  updatedAt?: string;
  tags?: string[];
  composed?: boolean;
}
