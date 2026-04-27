import { describe, it, expect } from 'vitest';

import { SchemaValidator } from './SchemaValidator.js';

describe('SchemaValidator', () => {
  const validator = new SchemaValidator();

  describe('validate', () => {
    it('should validate a valid scenario', async () => {
      const scenario = {
        name: 'Test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency' as const, config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };
      const result = await validator.validate(scenario);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should reject scenario missing required fields', async () => {
      const scenario = { name: 'Test', targets: [] };
      const result = await validator.validate(scenario);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should reject scenario with invalid fault type', async () => {
      const scenario = {
        name: 'Test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'unknownType' as 'latency', config: { minDelay: 0, maxDelay: 0 } }],
          },
        ],
      };
      const result = await validator.validate(scenario);
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.keyword === 'enum')).toBe(true);
    });

    it('should reject probability above 1', async () => {
      const scenario = {
        name: 'Test',
        targets: [
          {
            selector: '*',
            faults: [
              { type: 'latency' as const, config: { minDelay: 0, maxDelay: 0 }, probability: 1.5 },
            ],
          },
        ],
      };
      const result = await validator.validate(scenario);
      expect(result.valid).toBe(false);
    });

    it('should accept scenario with overrides and metadata', async () => {
      const scenario = {
        name: 'Test',
        version: '1.0.0',
        defaults: { probability: 0.1, delay: 100 },
        targets: [
          {
            selector: '*',
            faults: [{ type: 'timeout' as const, config: { timeout: 1000 } }],
          },
        ],
        overrides: [
          {
            selector: 'api.*',
            priority: 50,
            faults: [{ type: 'rateLimit' as const, config: { retryAfter: 60 } }],
          },
        ],
        metadata: {
          author: 'test',
          tags: ['test'],
          createdAt: '2026-01-01T00:00:00Z',
        },
      };
      const result = await validator.validate(scenario);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateFile', () => {
    it('should validate yaml content', async () => {
      const content = `name: Test\ntargets:\n  - selector: "*"\n    faults:\n      - type: latency\n        config:\n          minDelay: 100\n          maxDelay: 200\n`;
      const result = await validator.validateFile(content, 'yaml');
      expect(result.valid).toBe(true);
    });

    it('should validate json content', async () => {
      const content = JSON.stringify({
        name: 'Test',
        targets: [{ selector: '*', faults: [{ type: 'timeout', config: { timeout: 1000 } }] }],
      });
      const result = await validator.validateFile(content, 'json');
      expect(result.valid).toBe(true);
    });

    it('should return parse error for invalid yaml', async () => {
      const content = '{ bad';
      const result = await validator.validateFile(content, 'yaml');
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.keyword === 'parse')).toBe(true);
    });

    it('should return parse error for invalid json', async () => {
      const content = '{"name": "Test",}';
      const result = await validator.validateFile(content, 'json');
      expect(result.valid).toBe(false);
      expect(result.errors!.some((e) => e.keyword === 'parse')).toBe(true);
    });
  });

  describe('custom schema path', () => {
    it('should load custom schema', async () => {
      const customValidator = new SchemaValidator('./src/schemas/scenario-schema.json');
      const scenario = {
        name: 'Test',
        targets: [
          {
            selector: '*',
            faults: [{ type: 'latency' as const, config: { minDelay: 100, maxDelay: 200 } }],
          },
        ],
      };
      const result = await customValidator.validate(scenario);
      expect(result.valid).toBe(true);
    });
  });
});
