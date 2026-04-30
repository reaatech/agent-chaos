import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { generateCommand } from './generate.js';

describe('generateCommand', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-chaos-test-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should generate a known template', async () => {
    await generateCommand('network-degradation', { output: tmpDir });

    const files = await fs.readdir(tmpDir);
    expect(files).toContain('network-degradation.yaml');

    const content = await fs.readFile(path.join(tmpDir, 'network-degradation.yaml'), 'utf-8');
    expect(content).toContain('name:');
  });

  it('should throw for an unknown template', async () => {
    await expect(generateCommand('unknown-template', { output: tmpDir })).rejects.toThrow(
      'Unknown template type',
    );
  });
});
