import { readFile } from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Scenario } from '@agent-chaos/core';
import { Ajv } from 'ajv';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ValidationResult {
  valid: boolean;
  errors?: Array<{
    path: string;
    message: string;
    keyword: string;
  }>;
}

/**
 * Validates chaos scenarios against a JSON Schema.
 */
export class SchemaValidator {
  private ajv: Ajv;
  private schemaPath: string;
  private schemaContent?: object;

  constructor(schemaPath?: string) {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    (addFormats as unknown as (ajv: Ajv) => void)(this.ajv);

    this.schemaPath = schemaPath ?? path.join(__dirname, 'schemas/scenario-schema.json');
  }

  async validate(scenario: Scenario): Promise<ValidationResult> {
    if (!this.schemaContent) {
      const content = await readFile(this.schemaPath, 'utf-8');
      this.schemaContent = JSON.parse(content) as object;
    }

    this.ajv.errors = null;
    const valid = this.ajv.validate(this.schemaContent, scenario);

    if (valid) {
      return { valid: true };
    }

    const errors = (this.ajv.errors ?? []).map((err: ErrorObject) => ({
      path: err.instancePath ?? '/',
      message: err.message ?? 'Unknown error',
      keyword: err.keyword ?? 'unknown',
    }));

    return { valid: false, errors };
  }

  async validateFile(content: string, format: 'yaml' | 'json'): Promise<ValidationResult> {
    let scenario: Scenario;

    try {
      if (format === 'yaml') {
        scenario = YAML.parse(content) as Scenario;
      } else {
        scenario = JSON.parse(content) as Scenario;
      }
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            path: '/',
            message: `Failed to parse ${format}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            keyword: 'parse',
          },
        ],
      };
    }

    return this.validate(scenario);
  }
}
