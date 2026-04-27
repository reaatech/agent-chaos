import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MockInstance } from 'vitest';

import { initCommand } from './init.js';

describe('initCommand', () => {
  let tmpDir: string;
  let cwdSpy: MockInstance<[], string>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-chaos-init-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should create scenarios directory and sample file', async () => {
    await initCommand();

    const files = await fs.readdir(path.join(tmpDir, 'scenarios'));
    expect(files).toContain('hello-world.yaml');
  });
});
