import type { Injector } from '../types/index.js';

import { ContradictionInjector } from './ContradictionInjector.js';
import { LatencyInjector } from './LatencyInjector.js';
import { MalformedOutputInjector } from './MalformedOutputInjector.js';
import { PartialFailureInjector } from './PartialFailureInjector.js';
import { RateLimitInjector } from './RateLimitInjector.js';
import { StaleContextInjector } from './StaleContextInjector.js';
import { TimeoutInjector } from './TimeoutInjector.js';
import { TokenLimitInjector } from './TokenLimitInjector.js';

export { ContradictionInjector } from './ContradictionInjector.js';
export { LatencyInjector } from './LatencyInjector.js';
export { MalformedOutputInjector } from './MalformedOutputInjector.js';
export { PartialFailureInjector } from './PartialFailureInjector.js';
export { RateLimitInjector } from './RateLimitInjector.js';
export { StaleContextInjector } from './StaleContextInjector.js';
export { TimeoutInjector } from './TimeoutInjector.js';
export { TokenLimitInjector } from './TokenLimitInjector.js';

export { type LatencyConfig } from '../types/faults.js';
export { type TimeoutConfig } from '../types/faults.js';
export { type RateLimitConfig } from '../types/faults.js';
export { type TokenLimitConfig } from '../types/faults.js';
export { type MalformedOutputConfig } from '../types/faults.js';
export { type StaleContextConfig } from '../types/faults.js';
export { type ContradictionConfig } from '../types/faults.js';
export { type PartialFailureConfig } from '../types/faults.js';

export function createStandardInjectors(): Injector[] {
  return [
    new LatencyInjector(),
    new TimeoutInjector(),
    new RateLimitInjector(),
    new MalformedOutputInjector(),
    new TokenLimitInjector(),
    new StaleContextInjector(),
    new ContradictionInjector(),
    new PartialFailureInjector(),
  ];
}
