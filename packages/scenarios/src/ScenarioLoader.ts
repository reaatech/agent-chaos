import { type FSWatcher, watch as fsWatch } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import type {
  OverrideConfig,
  Scenario,
  ScenarioDefaults,
  TargetConfig,
} from '@reaatech/agent-chaos-core';
import YAML from 'yaml';

import { SchemaValidator } from './SchemaValidator.js';

export interface ScenarioLoaderOptions {
  formats?: ('yaml' | 'json')[];
  validation?: boolean;
  schemaPath?: string;
}

export interface ValidationError {
  file: string;
  line?: number;
  column?: number;
  message: string;
  details?: unknown;
}

/**
 * Loads, validates, and caches chaos scenarios from YAML/JSON files.
 * Supports composition via `extends` and file watching for hot reload.
 */
export class ScenarioLoader {
  private static readonly MAX_EXTENDS_DEPTH = 20;

  private supportedFormats: string[];
  private validationEnabled: boolean;
  private validator: SchemaValidator;
  private loadedScenarios: Map<string, Scenario> = new Map();
  private loadingPromises: Map<string, Promise<Scenario>> = new Map();
  private watchers: Map<string, FSWatcher> = new Map();
  private reloadCallbacks: Array<(scenario: Scenario) => void> = [];

  constructor(options: ScenarioLoaderOptions = {}) {
    this.supportedFormats = options.formats ?? ['yaml', 'json'];
    this.validationEnabled = options.validation ?? true;
    this.validator = new SchemaValidator(options.schemaPath);
  }

  async load(filePath: string): Promise<Scenario> {
    return this.loadWithStack(filePath, []);
  }

  private async loadWithStack(filePath: string, stack: string[]): Promise<Scenario> {
    const absolutePath = path.resolve(filePath);

    if (stack.length > ScenarioLoader.MAX_EXTENDS_DEPTH) {
      throw new ScenarioLoadError(absolutePath, 'Maximum extends depth exceeded');
    }

    if (stack.includes(absolutePath)) {
      const cycle = [...stack, absolutePath].join(' -> ');
      throw new ScenarioLoadError(absolutePath, `Circular extends detected: ${cycle}`);
    }

    const cached = this.loadedScenarios.get(absolutePath);
    if (cached) {
      return cached;
    }

    const inProgress = this.loadingPromises.get(absolutePath);
    if (inProgress) {
      return inProgress;
    }

    const loadPromise = this.doLoad(absolutePath, stack);
    this.loadingPromises.set(absolutePath, loadPromise);

    try {
      return await loadPromise;
    } finally {
      this.loadingPromises.delete(absolutePath);
    }
  }

  private async doLoad(absolutePath: string, stack: string[]): Promise<Scenario> {
    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      let scenario = this.parseContent(content, absolutePath);

      if (scenario.extends) {
        scenario = await this.resolveExtends(scenario, absolutePath, [...stack, absolutePath]);
      }

      if (this.validationEnabled) {
        await this.validate(scenario, absolutePath);
      }

      this.loadedScenarios.set(absolutePath, scenario);
      return scenario;
    } catch (error) {
      if (
        error instanceof ScenarioLoadError ||
        error instanceof ScenarioParseError ||
        error instanceof ScenarioValidationError
      ) {
        throw error;
      }
      throw new ScenarioLoadError(
        absolutePath,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async loadAll(directoryPath: string): Promise<Scenario[]> {
    const absolutePath = path.resolve(directoryPath);
    const scenarios: Scenario[] = [];

    try {
      const files = await fs.readdir(absolutePath, { withFileTypes: true });

      for (const file of files) {
        if (!file.isFile()) continue;

        const ext = path.extname(file.name).toLowerCase();
        const format = ext.slice(1);

        if (this.supportedFormats.includes(format)) {
          const filePath = path.join(absolutePath, file.name);
          try {
            const scenario = await this.load(filePath);
            scenarios.push(scenario);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`Skipping invalid scenario ${filePath}: ${message}`);
          }
        }
      }

      return scenarios;
    } catch (error) {
      throw new ScenarioLoadError(
        absolutePath,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  async validate(scenario: Scenario, filePath?: string): Promise<void> {
    if (!this.validationEnabled) {
      return;
    }

    const result = await this.validator.validate(scenario);

    if (!result.valid) {
      const errorMessages = (result.errors ?? []).map((err) => `${err.path}: ${err.message}`);
      throw new ScenarioValidationError(filePath ?? 'unknown', errorMessages, result.errors);
    }
  }

  watch(filePath: string): void {
    const absolutePath = path.resolve(filePath);

    if (this.watchers.has(absolutePath)) {
      return;
    }

    const reload = async (): Promise<void> => {
      try {
        this.loadedScenarios.delete(absolutePath);
        this.loadingPromises.delete(absolutePath);
        const scenario = await this.load(absolutePath);
        for (const cb of this.reloadCallbacks) {
          cb(scenario);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`Failed to reload scenario ${absolutePath}: ${message}`);
      }
    };

    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const watcher = fsWatch(absolutePath, (eventType, filename) => {
      if (eventType === 'change' || eventType === 'rename') {
        if (eventType === 'rename' && filename === null) {
          const unwatch = this.watchers.get(absolutePath);
          if (unwatch) {
            unwatch.close();
            this.watchers.delete(absolutePath);
          }
          return;
        }
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => void reload(), 100);
      }
    });

    this.watchers.set(absolutePath, watcher);
  }

  unwatch(filePath?: string): void {
    if (filePath) {
      const absolutePath = path.resolve(filePath);
      const watcher = this.watchers.get(absolutePath);
      if (watcher) {
        watcher.close();
        this.watchers.delete(absolutePath);
      }
    } else {
      for (const [, watcher] of this.watchers) {
        watcher.close();
      }
      this.watchers.clear();
    }
  }

  onReload(callback: (scenario: Scenario) => void): () => void {
    this.reloadCallbacks.push(callback);
    return () => {
      const idx = this.reloadCallbacks.indexOf(callback);
      if (idx !== -1) this.reloadCallbacks.splice(idx, 1);
    };
  }

  private async resolveExtends(
    scenario: Scenario,
    basePath: string,
    stack: string[],
  ): Promise<Scenario> {
    const parentRefs = Array.isArray(scenario.extends) ? scenario.extends : [scenario.extends];
    const parents: Scenario[] = [];

    for (const ref of parentRefs) {
      if (!ref) continue;
      const parentPath = path.resolve(path.dirname(basePath), ref);
      const parent = await this.loadWithStack(parentPath, stack);
      parents.push(parent);
    }

    const merged = this.mergeScenarios(parents, scenario);
    (merged as unknown as Record<string, unknown>).extends = undefined;
    return merged;
  }

  private mergeScenarios(parents: Scenario[], child: Scenario): Scenario {
    const mergedTargets = new Map<string, TargetConfig>();
    const mergedOverrides = new Map<string, OverrideConfig>();

    for (const parent of parents) {
      for (const target of parent.targets) {
        mergedTargets.set(target.selector, target);
      }
      if (parent.overrides) {
        for (const override of parent.overrides) {
          mergedOverrides.set(override.selector, override);
        }
      }
    }

    for (const target of child.targets) {
      mergedTargets.set(target.selector, target);
    }

    if (child.overrides) {
      for (const override of child.overrides) {
        mergedOverrides.set(override.selector, override);
      }
    }

    const mergedDefaults = this.mergeDefaults(
      parents.map((p) => p.defaults),
      child.defaults,
    );

    return {
      name: child.name,
      description: child.description,
      version: child.version,
      defaults: mergedDefaults,
      targets: Array.from(mergedTargets.values()),
      overrides: Array.from(mergedOverrides.values()),
      metadata: {
        ...parents.reduce((acc, p) => Object.assign(acc, p.metadata), {}),
        ...child.metadata,
        composed: true,
      },
    };
  }

  private mergeDefaults(
    parentDefaults: (ScenarioDefaults | undefined)[],
    childDefaults?: ScenarioDefaults,
  ): ScenarioDefaults | undefined {
    const validParents = parentDefaults.filter((d): d is ScenarioDefaults => d !== undefined);
    if (validParents.length === 0 && !childDefaults) return undefined;

    const merged: ScenarioDefaults = {};
    for (const parent of validParents) {
      if (parent.probability !== undefined) merged.probability = parent.probability;
      if (parent.delay !== undefined) merged.delay = parent.delay;
    }
    if (childDefaults?.probability !== undefined) merged.probability = childDefaults.probability;
    if (childDefaults?.delay !== undefined) merged.delay = childDefaults.delay;

    return Object.keys(merged).length > 0 ? merged : undefined;
  }

  private parseContent(content: string, filePath: string): Scenario {
    const ext = path.extname(filePath).toLowerCase();

    try {
      switch (ext) {
        case '.yaml':
        case '.yml':
          return YAML.parse(content) as Scenario;
        case '.json':
          return JSON.parse(content) as Scenario;
        default:
          throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      throw new ScenarioParseError(
        filePath,
        error instanceof Error ? error.message : 'Unknown parsing error',
      );
    }
  }

  clearCache(): void {
    this.loadedScenarios.clear();
  }

  getLoadedScenarios(): Scenario[] {
    return Array.from(this.loadedScenarios.values());
  }
}

export class ScenarioLoadError extends Error {
  constructor(
    public readonly filePath: string,
    message: string,
  ) {
    super(`Failed to load scenario from ${filePath}: ${message}`);
    this.name = 'ScenarioLoadError';
  }
}

export class ScenarioParseError extends Error {
  constructor(
    public readonly filePath: string,
    message: string,
  ) {
    super(`Failed to parse scenario ${filePath}: ${message}`);
    this.name = 'ScenarioParseError';
  }
}

export class ScenarioValidationError extends Error {
  constructor(
    public readonly filePath: string,
    public readonly messages: string[],
    public readonly details?: unknown,
  ) {
    super(`Validation failed for ${filePath}:\n${messages.join('\n')}`);
    this.name = 'ScenarioValidationError';
  }
}

export function createScenarioLoader(options: ScenarioLoaderOptions = {}): ScenarioLoader {
  return new ScenarioLoader(options);
}
