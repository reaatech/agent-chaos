import { beforeEach, describe, expect, it } from 'vitest';
import { ChaosEngine, createChaosEngine } from './ChaosEngine.js';
import { LatencyInjector } from './injectors/LatencyInjector.js';
import type { Scenario, ToolCall } from './types/index.js';

describe('ChaosEngine', () => {
  let engine: ChaosEngine;

  beforeEach(() => {
    engine = createChaosEngine();
  });

  describe('createChaosEngine', () => {
    it('should create an engine with default mode inject', () => {
      expect(engine.mode).toBe('inject');
    });

    it('should create an engine with custom mode', () => {
      const passthroughEngine = createChaosEngine({ mode: 'passthrough' });
      expect(passthroughEngine.mode).toBe('passthrough');
    });
  });

  describe('loadScenario', () => {
    it('should load a scenario', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };

      engine.loadScenario(scenario);
      expect(engine.scenarios).toHaveLength(1);
      expect(engine.scenarios[0].name).toBe('test-scenario');
    });

    it('should emit scenario_loaded event', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };

      engine.loadScenario(scenario);
      const events = engine.record();
      expect(events.some((e) => e.type === 'scenario_loaded')).toBe(true);
    });
  });

  describe('unloadScenario', () => {
    it('should unload a scenario by name', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };

      engine.loadScenario(scenario);
      engine.unloadScenario('test-scenario');
      expect(engine.scenarios).toHaveLength(0);
    });

    it('should emit scenario_unloaded event', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };

      engine.loadScenario(scenario);
      engine.unloadScenario('test-scenario');
      const events = engine.record();
      expect(events.some((e) => e.type === 'scenario_unloaded')).toBe(true);
    });
  });

  describe('setMode', () => {
    it('should change engine mode', () => {
      engine.setMode('record');
      expect(engine.mode).toBe('record');
    });
  });

  describe('registerInjector', () => {
    it('should register an injector', () => {
      const injector = new LatencyInjector();
      engine.registerInjector(injector);
      expect(engine.injectors.has('latency')).toBe(true);
    });
  });

  describe('intercept', () => {
    it('should passthrough in passthrough mode', async () => {
      engine.setMode('passthrough');
      const call: ToolCall = {
        id: '1',
        name: 'testTool',
        arguments: {},
        timestamp: Date.now(),
      };
      const response = await engine.intercept(call);
      expect(response.toolName).toBe('testTool');
      expect(response.error).toBeUndefined();
    });

    it('should record tool calls in record mode', async () => {
      engine.setMode('record');
      const call: ToolCall = {
        id: '1',
        name: 'testTool',
        arguments: {},
        timestamp: Date.now(),
      };
      const response = await engine.intercept(call);
      expect(response.toolName).toBe('testTool');

      const events = engine.record();
      expect(events.some((e) => e.type === 'tool_called')).toBe(true);
    });

    it('should process tool calls in inject mode', async () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: 'testTool',
            faults: [
              {
                type: 'timeout',
                probability: 1.0,
                config: { timeout: 1000 },
              },
            ],
          },
        ],
      };
      engine.loadScenario(scenario);
      engine.setMode('inject');

      const call: ToolCall = {
        id: '1',
        name: 'testTool',
        arguments: {},
        timestamp: Date.now(),
      };
      const response = await engine.intercept(call);
      expect(response.toolName).toBe('testTool');
    });

    it('should return response even when no scenario matches', async () => {
      engine.setMode('inject');
      const call: ToolCall = {
        id: '2',
        name: 'unknownTool',
        arguments: {},
        timestamp: Date.now(),
      };
      const response = await engine.intercept(call);
      expect(response.toolName).toBe('unknownTool');
      expect(response.result).toBeNull();
    });
  });

  describe('record', () => {
    it('should return recorded events', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };

      engine.loadScenario(scenario);
      const events = engine.record();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('scenario_loaded');
    });
  });

  describe('reset', () => {
    it('should clear events', () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };

      engine.loadScenario(scenario);
      engine.reset();
      expect(engine.record()).toHaveLength(0);
    });

    it('should reset injector call counts', async () => {
      const scenario: Scenario = {
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'tokenLimit',
                probability: 1.0,
                config: { triggerAfter: 1, remainingTokens: 50 },
              },
            ],
          },
        ],
      };
      engine.loadScenario(scenario);
      engine.setMode('inject');

      const call: ToolCall = {
        id: '1',
        name: 'testTool',
        arguments: {},
        timestamp: Date.now(),
      };
      await engine.intercept(call);

      engine.reset();
      const response = await engine.intercept(call);
      expect(response.toolName).toBe('testTool');
    });
  });

  describe('constructors', () => {
    it('should accept pre-loaded scenarios', () => {
      const scenario: Scenario = {
        name: 'preloaded',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 10, maxDelay: 20 } }],
          },
        ],
      };
      const customEngine = new ChaosEngine({ scenarios: [scenario] });
      expect(customEngine.scenarios).toHaveLength(1);
      expect(customEngine.scenarios[0].name).toBe('preloaded');
    });

    it('should accept custom randomSource', () => {
      const customEngine = new ChaosEngine({
        randomSource: { random: () => 0.5 },
      });
      expect(customEngine.randomSource.random()).toBe(0.5);
    });

    it('should accept custom middlewareTimeout', () => {
      const customEngine = new ChaosEngine({ middlewareTimeout: 5000 });
      expect(customEngine).toBeDefined();
    });
  });
});
