#!/usr/bin/env node
import { createRequire } from 'node:module';
import { program } from 'commander';
import { validateCommand } from './commands/validate.js';
import { generateCommand } from './commands/generate.js';
import { runCommand } from './commands/run.js';
import { initCommand } from './commands/init.js';

const require = createRequire(import.meta.url);
const pkg = require('@agent-chaos/cli/package.json') as { version: string };

async function handleError(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(message);
    process.exit(1);
  }
}

program
  .name('agent-chaos')
  .description('Fault injection toolkit for agent systems')
  .version(pkg.version);

program
  .command('validate <file>')
  .description('Validate a scenario file')
  .action(async (file: string) => handleError(() => validateCommand(file)));

program
  .command('generate <type>')
  .description('Generate a scenario template')
  .option('-o, --output <dir>', 'Output directory', '.')
  .action(async (type: string, options: { output?: string }) =>
    handleError(() => generateCommand(type, options))
  );

program
  .command('run <scenario>')
  .description('Run a chaos scenario')
  .option('-w, --watch', 'Watch for changes and reload', false)
  .action(async (scenario: string, options: { watch?: boolean }) =>
    handleError(() => runCommand(scenario, options))
  );

program
  .command('init')
  .description('Initialize a new chaos testing project')
  .action(async () => handleError(() => initCommand()));

void program.parseAsync().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
