import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { validateCommand } from './validate.js';

describe('validateCommand', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-chaos-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should validate a correct YAML scenario', async () => {
    const filePath = path.join(tmpDir, 'valid.yaml');
    await fs.writeFile(
      filePath,
      `name: test-scenario\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`,
      'utf-8',
    );

    await expect(validateCommand(filePath)).resolves.toBeUndefined();
  });

  it('should validate a correct JSON scenario', async () => {
    const filePath = path.join(tmpDir, 'valid.json');
    await fs.writeFile(
      filePath,
      JSON.stringify({
        name: 'test-scenario',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency', config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      }),
      'utf-8',
    );

    await expect(validateCommand(filePath)).resolves.toBeUndefined();
  });

  it('should throw for an invalid scenario', async () => {
    const filePath = path.join(tmpDir, 'invalid.yaml');
    await fs.writeFile(
      filePath,
      `name: test
version: "bad.version"
targets:
  - selector: test
    faults:
      - type: latency
        config:
          minDelay: notanumber
          maxDelay: 100
`,
      'utf-8',
    );

    await expect(validateCommand(filePath)).rejects.toThrow('Validation failed');
  });

  it('should throw for unsupported file format', async () => {
    const filePath = path.join(tmpDir, 'scenario.txt');
    await fs.writeFile(filePath, 'hello', 'utf-8');

    await expect(validateCommand(filePath)).rejects.toThrow('Unsupported file format');
  });
});
