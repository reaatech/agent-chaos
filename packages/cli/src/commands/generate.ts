import * as fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as path from 'node:path';

import chalk from 'chalk';

const TEMPLATES = [
  'network-degradation',
  'provider-outage',
  'rate-limit-storm',
  'token-exhaustion',
  'contradiction',
];

function resolveTemplateDir(): string {
  const require = createRequire(import.meta.url);
  return path.dirname(
    require.resolve('@reaatech/agent-chaos-scenarios/templates/network-degradation.yaml'),
  );
}

export async function generateCommand(type: string, options: { output?: string }): Promise<void> {
  if (!TEMPLATES.includes(type)) {
    console.error(chalk.red('Error:'), `Unknown template type: ${type}`);
    console.log('Available templates:');
    for (const t of TEMPLATES) {
      console.log(`  - ${t}`);
    }
    throw new Error(`Unknown template type: ${type}`);
  }

  const templateDir = resolveTemplateDir();
  const templatePath = path.join(templateDir, `${type}.yaml`);
  const outputDir = options.output ? path.resolve(options.output) : process.cwd();
  const outputPath = path.join(outputDir, `${type}.yaml`);

  try {
    await fs.mkdir(outputDir, { recursive: true });
    const content = await fs.readFile(templatePath, 'utf-8');
    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(chalk.green('✓'), `Generated scenario template: ${outputPath}`);
  } catch (error) {
    throw new Error(
      `Failed to generate ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}
