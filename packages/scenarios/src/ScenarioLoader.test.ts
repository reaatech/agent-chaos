import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createScenarioLoader,
  ScenarioLoadError,
  type ScenarioLoader,
  ScenarioParseError,
  ScenarioValidationError,
} from './ScenarioLoader.js';

describe('ScenarioLoader', () => {
  let loader: ScenarioLoader;
  let tempDir: string;

  beforeEach(async () => {
    loader = createScenarioLoader();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-chaos-'));
  });

  afterEach(async () => {
    loader.clearCache();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('load', () => {
    it('should load a yaml scenario', async () => {
      const filePath = path.join(tempDir, 'test.yaml');
      await fs.writeFile(
        filePath,
        `name: Test Scenario\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      const scenario = await loader.load(filePath);
      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.targets).toHaveLength(1);
    });

    it('should load a json scenario', async () => {
      const filePath = path.join(tempDir, 'test.json');
      await fs.writeFile(
        filePath,
        JSON.stringify({
          name: 'JSON Test',
          targets: [
            {
              selector: '*',
              faults: [{ type: 'timeout', config: { timeout: 1000 } }],
            },
          ],
        }),
      );

      const scenario = await loader.load(filePath);
      expect(scenario.name).toBe('JSON Test');
    });

    it('should cache loaded scenarios', async () => {
      const filePath = path.join(tempDir, 'cached.yaml');
      await fs.writeFile(
        filePath,
        `name: Cached\ntargets:\n  - selector: "*"\n    faults:\n      - type: timeout\n        config:\n          timeout: 1000\n`,
      );

      const s1 = await loader.load(filePath);
      const s2 = await loader.load(filePath);
      expect(s1).toBe(s2);
    });

    it('should throw ScenarioParseError for invalid yaml', async () => {
      const filePath = path.join(tempDir, 'bad.yaml');
      await fs.writeFile(filePath, '{ invalid');
      await expect(loader.load(filePath)).rejects.toBeInstanceOf(ScenarioParseError);
    });

    it('should throw ScenarioLoadError for missing file', async () => {
      const filePath = path.join(tempDir, 'missing.yaml');
      await expect(loader.load(filePath)).rejects.toBeInstanceOf(ScenarioLoadError);
    });

    it('should throw ScenarioValidationError for invalid scenario', async () => {
      const filePath = path.join(tempDir, 'invalid.yaml');
      await fs.writeFile(
        filePath,
        `name: Invalid
version: "not.a.version"
targets:
  - selector: test
    faults:
      - type: latency
        config:
          minDelay: invalid
          maxDelay: 100
`,
      );
      await expect(loader.load(filePath)).rejects.toBeInstanceOf(ScenarioValidationError);
    });

    it('should skip validation when disabled', async () => {
      const noValidateLoader = createScenarioLoader({ validation: false });
      const filePath = path.join(tempDir, 'invalid.yaml');
      await fs.writeFile(filePath, 'name: SkipValidation\n');
      const scenario = await noValidateLoader.load(filePath);
      expect(scenario.name).toBe('SkipValidation');
    });
  });

  describe('composition', () => {
    it('should resolve extends', async () => {
      const basePath = path.join(tempDir, 'base.yaml');
      const childPath = path.join(tempDir, 'child.yaml');

      await fs.writeFile(
        basePath,
        `name: Base\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      await fs.writeFile(
        childPath,
        `name: Child\nextends: base.yaml\ntargets:\n  - selector: "api.*"\n    faults:\n      - type: timeout\n        config:\n          timeout: 5000\n`,
      );

      const scenario = await loader.load(childPath);
      expect(scenario.name).toBe('Child');
      expect(scenario.targets).toHaveLength(2);
      expect(scenario.targets.some((t) => t.selector === '*')).toBe(true);
      expect(scenario.targets.some((t) => t.selector === 'api.*')).toBe(true);
    });

    it('should merge defaults from parent', async () => {
      const basePath = path.join(tempDir, 'base.yaml');
      const childPath = path.join(tempDir, 'child.yaml');

      await fs.writeFile(
        basePath,
        `name: Base\ndefaults:\n  probability: 0.5\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      await fs.writeFile(
        childPath,
        `name: Child\nextends: base.yaml\ndefaults:\n  delay: 100\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      const scenario = await loader.load(childPath);
      expect(scenario.defaults?.probability).toBe(0.5);
      expect(scenario.defaults?.delay).toBe(100);
    });

    it('should support multiple extends', async () => {
      const aPath = path.join(tempDir, 'a.yaml');
      const bPath = path.join(tempDir, 'b.yaml');
      const childPath = path.join(tempDir, 'child.yaml');

      await fs.writeFile(
        aPath,
        `name: A\ntargets:\n  - selector: "a.*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      await fs.writeFile(
        bPath,
        `name: B\ntargets:\n  - selector: "b.*"\n    faults:\n      - type: timeout\n        config:\n          timeout: 1000\n`,
      );

      await fs.writeFile(
        childPath,
        `name: Child\nextends:\n  - a.yaml\n  - b.yaml\ntargets:\n  - selector: "child.*"\n    faults:\n      - type: rateLimit\n        config:\n          retryAfter: 60\n`,
      );

      const scenario = await loader.load(childPath);
      expect(scenario.targets).toHaveLength(3);
    });
  });

  describe('loadAll', () => {
    it('should load all scenarios in a directory', async () => {
      await fs.writeFile(
        path.join(tempDir, 's1.yaml'),
        `name: S1\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );
      await fs.writeFile(
        path.join(tempDir, 's2.yaml'),
        `name: S2\ntargets:\n  - selector: "*"\n    faults:\n      - type: timeout\n        config:\n          timeout: 1000\n`,
      );

      const scenarios = await loader.loadAll(tempDir);
      expect(scenarios).toHaveLength(2);
    });

    it('should skip invalid scenarios in directory', async () => {
      await fs.writeFile(
        path.join(tempDir, 'valid.yaml'),
        `name: Valid\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );
      await fs.writeFile(path.join(tempDir, 'invalid.yaml'), 'bad');

      const scenarios = await loader.loadAll(tempDir);
      expect(scenarios).toHaveLength(1);
    });

    it('should throw for missing directory', async () => {
      await expect(loader.loadAll(path.join(tempDir, 'missing'))).rejects.toBeInstanceOf(
        ScenarioLoadError,
      );
    });
  });

  describe('watch / unwatch / onReload', () => {
    it('should watch and reload a scenario', async () => {
      const filePath = path.join(tempDir, 'watch.yaml');
      await fs.writeFile(
        filePath,
        `name: WatchTest\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      await loader.load(filePath);
      loader.watch(filePath);

      const reloadPromise = new Promise<void>((resolve) => {
        const unbind = loader.onReload((scenario) => {
          if (scenario.name === 'WatchTestUpdated') {
            unbind();
            resolve();
          }
        });
      });

      await fs.writeFile(
        filePath,
        `name: WatchTestUpdated\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      await reloadPromise;
      loader.unwatch();
    });

    it('should not create duplicate watchers', async () => {
      const filePath = path.join(tempDir, 'watch.yaml');
      await fs.writeFile(
        filePath,
        `name: WatchTest\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      loader.watch(filePath);
      loader.watch(filePath); // duplicate
      loader.unwatch(filePath);
    });

    it('should unwatch specific file', async () => {
      const filePath = path.join(tempDir, 'watch.yaml');
      await fs.writeFile(
        filePath,
        `name: WatchTest\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      loader.watch(filePath);
      loader.unwatch(filePath);
    });
  });

  describe('getLoadedScenarios / clearCache', () => {
    it('should return loaded scenarios', async () => {
      const filePath = path.join(tempDir, 'test.yaml');
      await fs.writeFile(
        filePath,
        `name: Test\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      expect(loader.getLoadedScenarios()).toHaveLength(0);
      await loader.load(filePath);
      expect(loader.getLoadedScenarios()).toHaveLength(1);
    });

    it('should clear cache', async () => {
      const filePath = path.join(tempDir, 'test.yaml');
      await fs.writeFile(
        filePath,
        `name: Test\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      );

      await loader.load(filePath);
      loader.clearCache();
      expect(loader.getLoadedScenarios()).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('should validate a scenario directly', async () => {
      const scenario = {
        name: 'Direct',
        targets: [
          {
            selector: '*',
            faults: [
              {
                type: 'latency' as const,
                config: { minDelay: 100, maxDelay: 200 },
              },
            ],
          },
        ],
      };
      await expect(loader.validate(scenario)).resolves.toBeUndefined();
    });

    it('should skip validation when disabled', async () => {
      const noValidateLoader = createScenarioLoader({ validation: false });
      const scenario = { name: 'Direct', targets: [] };
      await expect(
        noValidateLoader.validate(
          scenario as unknown as import('@reaatech/agent-chaos-core').Scenario,
        ),
      ).resolves.toBeUndefined();
    });
  });
});
