import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Middleware } from './Middleware.js';
import { ChaosEngine } from './ChaosEngine.js';
import type { ToolCall, Scenario, Injector } from './types/index.js';
import { MathRandom } from './utils/RandomSource.js';

describe('Middleware', () => {
  let engine: ChaosEngine;
  let middleware: Middleware;

  beforeEach(() => {
    engine = new ChaosEngine();
    middleware = new Middleware(engine, { randomSource: new MathRandom() });
  });

  const makeCall = (name: string): ToolCall => ({
    id: '1',
    name,
    arguments: {},
    timestamp: Date.now(),
  });

  describe('execute', () => {
    it('should passthrough when no scenarios match', async () => {
      const response = await middleware.execute(makeCall('testTool'), []);
      expect(response.toolName).toBe('testTool');
      expect(response.result).toBeNull();
    });

    it('should passthrough when no faults match selector', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: 'other.*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.toolName).toBe('testTool');
    });

    it('should passthrough when no injector found', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };
      engine.injectors.clear();
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.toolName).toBe('testTool');
    });

    it('should passthrough when injector canInject returns false', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 1 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'latency',
        canInject: vi.fn().mockReturnValue(false),
        inject: vi.fn(),
      };
      engine.injectors.set('latency', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.toolName).toBe('testTool');
      expect(mockInjector.canInject).toHaveBeenCalled();
    });

    it('should inject fault when all conditions met', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 1 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'latency',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockResolvedValue({
          shouldInject: true,
          mockResponse: {
            id: '1',
            toolName: 'testTool',
            result: { injected: true },
            duration: 0,
            timestamp: Date.now(),
          },
        }),
      };
      engine.injectors.set('latency', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.result).toEqual({ injected: true });
    });

    it('should passthrough when injector returns shouldInject false', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 1 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'latency',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockResolvedValue({
          shouldInject: false,
        }),
      };
      engine.injectors.set('latency', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.toolName).toBe('testTool');
      expect(response.result).toBeNull();
    });

    it('should inject with error response when no mockResponse', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'timeout', config: { timeout: 1000 }, probability: 1 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'timeout',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockResolvedValue({
          shouldInject: true,
          error: { code: 'TIMEOUT', message: 'Timed out' },
        }),
      };
      engine.injectors.set('timeout', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.error).toEqual({ code: 'TIMEOUT', message: 'Timed out' });
    });

    it('should handle execution errors gracefully', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 1 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'latency',
        canInject: vi.fn().mockImplementation(() => {
          throw new Error('Injector failure');
        }),
        inject: vi.fn(),
      };
      engine.injectors.set('latency', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.error?.code).toBe('MIDDLEWARE_ERROR');
    });

    it('should apply overrides', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: 'other.*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 1 }],
          },
        ],
        overrides: [
          {
            selector: '*',
            faults: [{ type: 'timeout', config: { timeout: 1000 }, probability: 1 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'timeout',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockResolvedValue({
          shouldInject: true,
          mockResponse: {
            id: '1',
            toolName: 'testTool',
            result: { injected: true },
            duration: 0,
            timestamp: Date.now(),
          },
        }),
      };
      engine.injectors.set('timeout', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.result).toEqual({ injected: true });
    });

    it('should use probability for fault selection', async () => {
      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 0 }],
          },
        ],
      };
      const mockInjector: Injector = {
        type: 'latency',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockResolvedValue({
          shouldInject: true,
          mockResponse: {
            id: '1',
            toolName: 'testTool',
            result: { injected: true },
            duration: 0,
            timestamp: Date.now(),
          },
        }),
      };
      engine.injectors.set('latency', mockInjector);
      const response = await middleware.execute(makeCall('testTool'), [scenario]);
      expect(response.result).toBeNull();
    });
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: false });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return timeout response when execution exceeds timeout', async () => {
      const mw = new Middleware(engine, { timeout: 100, randomSource: new MathRandom() });

      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 }, probability: 1 }],
          },
        ],
      };

      const mockInjector: Injector = {
        type: 'latency',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockImplementation(() => {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                shouldInject: true,
                mockResponse: {
                  id: '1',
                  toolName: 'testTool',
                  result: { injected: true },
                  duration: 0,
                  timestamp: Date.now(),
                },
              });
            }, 5000);
          });
        }),
      };
      engine.injectors.set('latency', mockInjector);

      const promise = mw.execute(makeCall('testTool'), [scenario]);
      vi.advanceTimersByTime(100);
      const response = await promise;

      expect(response.error?.code).toBe('MIDDLEWARE_TIMEOUT');
    });

    it('should complete normally when execution finishes within timeout', async () => {
      const mw = new Middleware(engine, { timeout: 1000, randomSource: new MathRandom() });

      const scenario: Scenario = {
        name: 'test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'timeout', config: { timeout: 100 }, probability: 1 }],
          },
        ],
      };

      const mockInjector: Injector = {
        type: 'timeout',
        canInject: vi.fn().mockReturnValue(true),
        inject: vi.fn().mockResolvedValue({
          shouldInject: true,
          error: { code: 'TIMEOUT', message: 'Injected timeout' },
        }),
      };
      engine.injectors.set('timeout', mockInjector);

      const promise = mw.execute(makeCall('testTool'), [scenario]);
      vi.advanceTimersByTime(0);
      const response = await promise;

      expect(response.error?.code).toBe('TIMEOUT');
    });
  });

  describe('call history', () => {
    it('should track call history', async () => {
      await middleware.execute(makeCall('tool1'), []);
      await middleware.execute(makeCall('tool2'), []);
      expect(middleware.getCallHistory()).toHaveLength(2);
    });

    it('should clear call history', async () => {
      await middleware.execute(makeCall('tool1'), []);
      middleware.clearCallHistory();
      expect(middleware.getCallHistory()).toHaveLength(0);
    });

    it('should limit history to 1000 entries', async () => {
      for (let i = 0; i < 1005; i++) {
        await middleware.execute(makeCall(`tool${i}`), []);
      }
      expect(middleware.getCallHistory()).toHaveLength(1000);
    });
  });
});
