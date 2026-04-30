import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import chalk from 'chalk';

export async function initCommand(): Promise<void> {
  const cwd = process.cwd();
  const scenariosDir = path.join(cwd, 'scenarios');

  try {
    await fs.mkdir(scenariosDir, { recursive: true });
  } catch (error) {
    throw new Error(
      `Failed to create scenarios directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  const sampleScenario = `name: Hello World Scenario
description: A basic chaos testing scenario to get started
version: "1.0.0"

defaults:
  probability: 0.1

targets:
  - selector: "*"
    faults:
      - type: latency
        config:
          minDelay: 100
          maxDelay: 500

metadata:
  author: agent-chaos
  tags:
    - beginner
    - hello-world
`;

  const samplePath = path.join(scenariosDir, 'hello-world.yaml');

  try {
    const exists = await fs.access(samplePath).then(
      () => true,
      () => false,
    );
    if (exists) {
      console.log(chalk.yellow('!'), `Scenario already exists, skipping: ${samplePath}`);
      return;
    }
  } catch {
    // access failed, file doesn't exist, proceed
  }

  try {
    await fs.writeFile(samplePath, sampleScenario, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write sample scenario: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  console.log(chalk.green('✓'), 'Initialized agent-chaos project');
  console.log(`  Created scenarios directory: ${scenariosDir}`);
  console.log(`  Sample scenario: ${samplePath}`);
}
