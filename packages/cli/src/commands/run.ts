import * as path from 'node:path';

import { createChaosEngine } from '@reaatech/agent-chaos-core';
import { createScenarioLoader } from '@reaatech/agent-chaos-scenarios';
import chalk from 'chalk';

const DEFAULT_SAMPLE_CALLS = 10;

function collectToolNames(scenario: {
  targets?: Array<{ selector: string }>;
}): string[] {
  const toolNames = new Set<string>();
  const targets = scenario.targets ?? [];
  for (const target of targets) {
    const sel = target.selector;
    if (sel === '*') {
      toolNames.add('search');
      toolNames.add('query');
      toolNames.add('fetch');
    } else {
      toolNames.add(sel.replace(/\*/g, 'default'));
    }
  }
  return toolNames.size > 0 ? [...toolNames] : ['search', 'query', 'fetch'];
}

export async function runCommand(
  scenarioPath: string,
  options: { watch?: boolean },
): Promise<void> {
  const absolutePath = path.resolve(scenarioPath);
  const loader = createScenarioLoader();
  const engine = createChaosEngine();

  const scenario = await loader.load(absolutePath);
  engine.loadScenario(scenario);

  console.log(chalk.green('✓'), `Loaded scenario: ${scenario.name}`);
  console.log(`  Description: ${scenario.description ?? 'N/A'}`);
  console.log(`  Targets: ${scenario.targets.length}`);
  console.log(`  Overrides: ${scenario.overrides?.length ?? 0}`);

  if (options.watch) {
    engine.setMode('inject');
    console.log(chalk.blue('Watching for changes... Press Ctrl+C to stop'));

    const unbind = loader.onReload((reloaded) => {
      engine.unloadScenario(scenario.name);
      engine.loadScenario(reloaded);
      console.log(chalk.blue('↻'), `Reloaded scenario: ${reloaded.name}`);
    });
    loader.watch(absolutePath);

    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        unbind();
        loader.unwatch();
        console.log(chalk.yellow('\nStopped watching'));
        resolve();
      });
    });
    return;
  }

  engine.setMode('inject');
  const toolNames = collectToolNames(scenario);

  console.log(chalk.blue('\nRunning sample tool calls...\n'));

  for (let i = 0; i < DEFAULT_SAMPLE_CALLS; i++) {
    const toolName = toolNames[Math.floor(Math.random() * toolNames.length)];
    const response = await engine.intercept({
      id: `sample-${i}`,
      name: toolName,
      arguments: { sample: true, index: i },
      timestamp: Date.now(),
    });

    if (response.error) {
      console.log(
        chalk.red('  ✗'),
        `Call #${i + 1} ${toolName}: ${response.error.code} - ${response.error.message}`,
      );
    } else {
      console.log(chalk.green('  ✓'), `Call #${i + 1} ${toolName}: passed through`);
    }
  }

  const events = engine.record();
  const faultsInjected = events.filter((e) => e.type === 'fault_injected');

  console.log(chalk.blue('\n── Summary ──'));
  console.log(`  Total calls:    ${DEFAULT_SAMPLE_CALLS}`);
  console.log(`  Faults injected: ${faultsInjected.length}`);
  console.log(`  Injectors:      ${engine.injectors.size}`);
  console.log(`  Scenarios:      ${engine.scenarios.length}`);
  console.log();
}
