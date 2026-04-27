export interface LatencyConfig {
  minDelay: number;
  maxDelay: number;
  distribution?: 'uniform' | 'exponential' | 'normal' | 'burst';
}

export interface TimeoutConfig {
  timeout: number;
  message?: string;
}

export interface RateLimitConfig {
  retryAfter?: number;
  includeHeaders?: boolean;
  message?: string;
}

export interface TokenLimitConfig {
  triggerAfter?: number;
  remainingTokens?: number;
  maxTokens?: number;
  includeSuggestions?: boolean;
}

export interface MalformedOutputConfig {
  patterns?: ('truncated' | 'invalidJson' | 'missingFields' | 'wrongType' | 'extraFields')[];
  severity?: 'low' | 'medium' | 'high';
}

export interface StaleContextConfig {
  stalenessSeconds?: number;
  markAsFresh?: boolean;
}

export interface ContradictionConfig {
  conflicts?: Array<{
    field: string;
    values: unknown[];
  }>;
}

export interface PartialFailureConfig {
  failureRate?: number;
  errorTypes?: string[];
  degradedResult?: boolean;
}
