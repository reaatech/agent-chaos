import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { runCommand } from './run.js';

describe('runCommand', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-chaos-run-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should load and display a valid scenario', async () => {
    const scenarioPath = path.join(tmpDir, 'test.yaml');
    const yamlContent = `name: test-run-scenario
description: A test scenario for run command
targets:
  - selector: "*"
    faults:
      - type: latency
        config:
          minDelay: 100
          maxDelay: 200
        probability: 0.5
`;
    await fs.writeFile(scenarioPath, yamlContent, 'utf-8');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(scenarioPath, {});

    const output = logSpy.mock.calls.flat().join(' ');
    expect(output).toContain('test-run-scenario');
    expect(output).toContain('A test scenario for run command');

    logSpy.mockRestore();
  });

  it('should log target and override counts', async () => {
    const scenarioPath = path.join(tmpDir, 'test.yaml');
    const yamlContent = `name: count-test
targets:
  - selector: "tool.a"
    faults:
      - type: timeout
        config:
          timeout: 5000
overrides:
  - selector: "tool.b"
    faults:
      - type: rateLimit
        config:
          retryAfter: 30
`;
    await fs.writeFile(scenarioPath, yamlContent, 'utf-8');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(scenarioPath, {});

    const output = logSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Targets: 1');
    expect(output).toContain('Overrides: 1');

    logSpy.mockRestore();
  });

  it('should handle scenario without description', async () => {
    const scenarioPath = path.join(tmpDir, 'test.yaml');
    const yamlContent = `name: nodesc-test
targets:
  - selector: "*"
    faults:
      - type: latency
        config:
          minDelay: 50
          maxDelay: 100
`;
    await fs.writeFile(scenarioPath, yamlContent, 'utf-8');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await runCommand(scenarioPath, {});

    const output = logSpy.mock.calls.flat().join(' ');
    expect(output).toContain('N/A');

    logSpy.mockRestore();
  });
});
