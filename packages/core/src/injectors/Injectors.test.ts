import { describe, expect, it } from 'vitest';

import { ContradictionInjector } from './ContradictionInjector.js';
import { LatencyInjector } from './LatencyInjector.js';
import { MalformedOutputInjector } from './MalformedOutputInjector.js';
import { PartialFailureInjector } from './PartialFailureInjector.js';
import { RateLimitInjector } from './RateLimitInjector.js';
import { StaleContextInjector } from './StaleContextInjector.js';
import { TimeoutInjector } from './TimeoutInjector.js';
import { TokenLimitInjector } from './TokenLimitInjector.js';

import { createStandardInjectors } from './index.js';

describe('createStandardInjectors', () => {
  it('returns 8 injectors', () => {
    const injectors = createStandardInjectors();
    expect(injectors).toHaveLength(8);
  });

  it('contains all standard injector types', () => {
    const injectors = createStandardInjectors();
    const types = injectors.map((i) => i.type).sort();

    expect(types).toEqual([
      'contradiction',
      'latency',
      'malformedOutput',
      'partialFailure',
      'rateLimit',
      'staleContext',
      'timeout',
      'tokenLimit',
    ]);
  });

  it('returns correct concrete classes', () => {
    const injectors = createStandardInjectors();
    expect(injectors[0]).toBeInstanceOf(LatencyInjector);
    expect(injectors[1]).toBeInstanceOf(TimeoutInjector);
    expect(injectors[2]).toBeInstanceOf(RateLimitInjector);
    expect(injectors[3]).toBeInstanceOf(MalformedOutputInjector);
    expect(injectors[4]).toBeInstanceOf(TokenLimitInjector);
    expect(injectors[5]).toBeInstanceOf(StaleContextInjector);
    expect(injectors[6]).toBeInstanceOf(ContradictionInjector);
    expect(injectors[7]).toBeInstanceOf(PartialFailureInjector);
  });
});
