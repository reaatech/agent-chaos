import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { SchemaValidator } from '@agent-chaos/scenarios';
import chalk from 'chalk';

export async function validateCommand(filePath: string): Promise<void> {
  const absolutePath = path.resolve(filePath);

  let content: string;
  try {
    content = await fs.readFile(absolutePath, 'utf-8');
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = path.extname(absolutePath).toLowerCase();

  const format: 'yaml' | 'json' =
    ext === '.yaml' || ext === '.yml' ? 'yaml' : ext === '.json' ? 'json' : null!;
  if (!format) {
    throw new Error(`Unsupported file format: ${ext}. Use .yaml, .yml, or .json`);
  }

  const validator = new SchemaValidator();
  const result = await validator.validateFile(content, format);

  if (result.valid) {
    console.log(chalk.green('✓'), `Scenario is valid: ${filePath}`);
    return;
  }

  console.log(chalk.red('✗'), `Scenario validation failed: ${filePath}`);
  for (const error of result.errors ?? []) {
    console.log(`  ${chalk.yellow(error.path)}: ${error.message}`);
  }
  throw new Error('Validation failed');
}
