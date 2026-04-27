# Skill: create-adapter

## Description

Create a framework adapter for integrating agent-chaos with popular agent frameworks like LangChain, LlamaIndex, or Vercel AI SDK. Adapters provide framework-specific integration points.

## Prerequisites

- Monorepo initialized (run `init-monorepo` first)
- ChaosEngine implemented (run `create-engine` first)
- Middleware implemented (run `create-middleware` first)
- Core package exists

## Input Parameters

| Parameter | Type   | Required | Description                                                         |
| --------- | ------ | -------- | ------------------------------------------------------------------- |
| framework | string | yes      | Target framework: 'langchain', 'llamaindex', 'vercel-ai', 'generic' |
| version   | string | no       | Framework version constraint (default: latest)                      |

## Execution Steps

1. Create adapter file in packages/adapters/src/
2. Implement base adapter interface
3. Add framework-specific tool wrapping
4. Implement callback/hook integration
5. Add stream handling if applicable
6. Create adapter factory function
7. Write integration tests
8. Export from adapters package

## Output

- Framework adapter implementation
- Tool wrapping utilities
- Integration examples
- Exported from adapters package

## Example Usage

```
Please execute the "create-adapter" skill with:
- framework: "langchain"
- version: "^0.1.0"
```

## Error Handling

- Handle framework version incompatibilities
- Provide fallback for unsupported features
- Graceful degradation if framework not installed

## Implementation Details

### Base Adapter Interface (packages/adapters/src/base.ts)

```typescript
import type { ChaosEngine, ToolCall, ToolResponse } from '@agent-chaos/core';

export interface AdapterOptions {
  engine: ChaosEngine;
  targets?: string[]; // Specific tools to wrap
  exclude?: string[]; // Tools to exclude
}

export interface Adapter {
  name: string;
  framework: string;

  wrap(): void;
  unwrap(): void;
  isWrapped(): boolean;

  onToolCall?(callback: (call: ToolCall) => void): void;
  onToolResponse?(callback: (response: ToolResponse) => void): void;
}

export abstract class BaseAdapter implements Adapter {
  abstract readonly name: string;
  abstract readonly framework: string;

  protected engine: ChaosEngine;
  protected targets?: string[];
  protected exclude?: string[];
  protected wrapped: boolean = false;

  constructor(options: AdapterOptions) {
    this.engine = options.engine;
    this.targets = options.targets;
    this.exclude = options.exclude;
  }

  abstract wrap(): void;
  abstract unwrap(): void;
  abstract isWrapped(): boolean;

  shouldWrapTool(toolName: string): boolean {
    if (this.exclude?.includes(toolName)) {
      return false;
    }

    if (!this.targets || this.targets.length === 0) {
      return true; // Wrap all tools
    }

    return this.targets.includes(toolName);
  }
}
```

### LangChain Adapter (packages/adapters/src/langchain.ts)

```typescript
import { BaseAdapter, type AdapterOptions } from './base';
import type { ChaosEngine, ToolCall, ToolResponse } from '@agent-chaos/core';
import { v4 as uuidv4 } from 'uuid';

export interface LangChainAdapterOptions extends AdapterOptions {
  // LangChain-specific options
  wrapStructuredToolOutput?: boolean;
}

export class LangChainAdapter extends BaseAdapter {
  readonly name = 'LangChain Adapter';
  readonly framework = 'langchain';

  private originalTools: Map<string, Function> = new Map();
  private wrapStructuredToolOutput: boolean;

  constructor(options: LangChainAdapterOptions) {
    super(options);
    this.wrapStructuredToolOutput = options.wrapStructuredToolOutput ?? true;
  }

  wrap(): void {
    if (this.wrapped) {
      throw new Error('Adapter already wrapped');
    }

    // Dynamic import to avoid hard dependency
    const { StructuredTool } = require('@langchain/core/tools');

    // Store original _call method
    this.originalTools.set('StructuredTool.prototype._call', StructuredTool.prototype._call);

    // Wrap the _call method
    const adapter = this;
    StructuredTool.prototype._call = async function wrappedCall(
      arg: unknown,
      config?: { runName?: string }
    ) {
      const toolName = this.name;

      if (!adapter.shouldWrapTool(toolName)) {
        // Call original
        const original = adapter.originalTools.get('StructuredTool.prototype._call');
        return original?.call(this, arg, config);
      }

      const call: ToolCall = {
        id: uuidv4(),
        name: toolName,
        arguments: arg as Record<string, unknown>,
        timestamp: Date.now(),
        metadata: {
          runName: config?.runName,
        },
      };

      try {
        // Let chaos engine intercept
        const response = await adapter.engine.intercept(call);

        if (response.error) {
          throw new Error(response.error.message);
        }

        return response.result;
      } catch (error) {
        // Handle error
        const errorResponse: ToolResponse = {
          id: call.id,
          toolName,
          result: null,
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          duration: 0,
          timestamp: Date.now(),
        };

        throw error;
      }
    };

    this.wrapped = true;
  }

  unwrap(): void {
    if (!this.wrapped) {
      return;
    }

    const { StructuredTool } = require('@langchain/core/tools');
    const original = this.originalTools.get('StructuredTool.prototype._call');

    if (original) {
      StructuredTool.prototype._call = original;
    }

    this.originalTools.clear();
    this.wrapped = false;
  }

  isWrapped(): boolean {
    return this.wrapped;
  }
}

export function createLangChainAdapter(options: LangChainAdapterOptions): LangChainAdapter {
  return new LangChainAdapter(options);
}
```

### LlamaIndex Adapter (packages/adapters/src/llamaindex.ts)

```typescript
import { BaseAdapter, type AdapterOptions } from './base';
import type { ChaosEngine, ToolCall, ToolResponse } from '@agent-chaos/core';
import { v4 as uuidv4 } from 'uuid';

export interface LlamaIndexAdapterOptions extends AdapterOptions {
  wrapQueryEngine?: boolean;
}

export class LlamaIndexAdapter extends BaseAdapter {
  readonly name = 'LlamaIndex Adapter';
  readonly framework = 'llamaindex';

  private originalTools: Map<string, Function> = new Map();

  wrap(): void {
    if (this.wrapped) {
      throw new Error('Adapter already wrapped');
    }

    const { BaseTool } = require('llamaindex');
    const adapter = this;

    // Store original
    this.originalTools.set('BaseTool.prototype.call', BaseTool.prototype.call);

    // Wrap call method
    BaseTool.prototype.call = async function wrappedCall(
      this: InstanceType<typeof BaseTool>,
      ...args: unknown[]
    ) {
      const toolName = this.metadata.name;

      if (!adapter.shouldWrapTool(toolName)) {
        const original = adapter.originalTools.get('BaseTool.prototype.call');
        return original?.call(this, ...args);
      }

      const call: ToolCall = {
        id: uuidv4(),
        name: toolName,
        arguments: args[0] as Record<string, unknown>,
        timestamp: Date.now(),
      };

      try {
        const response = await adapter.engine.intercept(call);

        if (response.error) {
          throw new Error(response.error.message);
        }

        return response.result;
      } catch (error) {
        throw error;
      }
    };

    this.wrapped = true;
  }

  unwrap(): void {
    if (!this.wrapped) {
      return;
    }

    const { BaseTool } = require('llamaindex');
    const original = this.originalTools.get('BaseTool.prototype.call');

    if (original) {
      BaseTool.prototype.call = original;
    }

    this.originalTools.clear();
    this.wrapped = false;
  }

  isWrapped(): boolean {
    return this.wrapped;
  }
}

export function createLlamaIndexAdapter(options: LlamaIndexAdapterOptions): LlamaIndexAdapter {
  return new LlamaIndexAdapter(options);
}
```

### Vercel AI SDK Adapter (packages/adapters/src/vercel-ai.ts)

```typescript
import { BaseAdapter, type AdapterOptions } from './base';
import type { ChaosEngine, ToolCall, ToolResponse } from '@agent-chaos/core';
import { v4 as uuidv4 } from 'uuid';

export interface VercelAIAdapterOptions extends AdapterOptions {
  wrapGenerateText?: boolean;
  wrapStreamText?: boolean;
}

export class VercelAIAdapter extends BaseAdapter {
  readonly name = 'Vercel AI SDK Adapter';
  readonly framework = 'vercel-ai';

  private originalFunctions: Map<string, Function> = new Map();

  wrap(): void {
    if (this.wrapped) {
      throw new Error('Adapter already wrapped');
    }

    const ai = require('ai');
    const adapter = this;

    // Wrap generateText
    if (this.originalFunctions.has('generateText')) {
      this.originalFunctions.set('generateText', ai.generateText);
    }

    ai.generateText = async function wrappedGenerateText(options: unknown) {
      // Extract tools from options and wrap them
      const opts = options as { tools?: Record<string, { execute: Function }> };

      if (opts.tools) {
        opts.tools = adapter.wrapTools(opts.tools);
      }

      const original = adapter.originalFunctions.get('generateText');
      return original?.call(ai, opts);
    };

    this.wrapped = true;
  }

  private wrapTools(tools: Record<string, { execute: Function }>) {
    const wrappedTools: Record<string, { execute: Function }> = {};
    const adapter = this;

    for (const [name, tool] of Object.entries(tools)) {
      if (adapter.shouldWrapTool(name)) {
        wrappedTools[name] = {
          ...tool,
          execute: async function wrappedExecute(args: unknown) {
            const call: ToolCall = {
              id: uuidv4(),
              name,
              arguments: args as Record<string, unknown>,
              timestamp: Date.now(),
            };

            const response = await adapter.engine.intercept(call);

            if (response.error) {
              throw new Error(response.error.message);
            }

            return response.result;
          },
        };
      } else {
        wrappedTools[name] = tool;
      }
    }

    return wrappedTools;
  }

  unwrap(): void {
    if (!this.wrapped) {
      return;
    }

    const ai = require('ai');
    const originalGenerateText = this.originalFunctions.get('generateText');

    if (originalGenerateText) {
      ai.generateText = originalGenerateText;
    }

    this.originalFunctions.clear();
    this.wrapped = false;
  }

  isWrapped(): boolean {
    return this.wrapped;
  }
}

export function createVercelAIAdapter(options: VercelAIAdapterOptions): VercelAIAdapter {
  return new VercelAIAdapter(options);
}
```

### Generic/REST Adapter (packages/adapters/src/generic.ts)

```typescript
import { BaseAdapter, type AdapterOptions } from './base';
import type { ChaosEngine, ToolCall, ToolResponse } from '@agent-chaos/core';
import { v4 as uuidv4 } from 'uuid';

export interface GenericAdapterOptions extends AdapterOptions {
  baseUrl?: string;
  interceptFetch?: boolean;
}

export class GenericAdapter extends BaseAdapter {
  readonly name = 'Generic Adapter';
  readonly framework = 'generic';

  private originalFetch: typeof fetch | null = null;
  private baseUrl: string;

  constructor(options: GenericAdapterOptions) {
    super(options);
    this.baseUrl = options.baseUrl ?? '';
  }

  wrap(): void {
    if (this.wrapped) {
      throw new Error('Adapter already wrapped');
    }

    const adapter = this;

    // Wrap global fetch
    this.originalFetch = globalThis.fetch;

    globalThis.fetch = async function wrappedFetch(
      input: string | URL | Request,
      init?: RequestInit
    ) {
      const url = typeof input === 'string' ? input : input.toString();

      // Check if this is a tool call based on URL pattern
      if (adapter.shouldWrapTool(url)) {
        const call: ToolCall = {
          id: uuidv4(),
          name: url,
          arguments: init?.body ? JSON.parse(init.body) : {},
          timestamp: Date.now(),
          metadata: {
            method: init?.method,
            headers: init?.headers,
          },
        };

        try {
          const response = await adapter.engine.intercept(call);

          if (response.error) {
            return Response.json({ error: response.error.message }, { status: 500 });
          }

          return Response.json(response.result);
        } catch (error) {
          return Response.json({ error: 'Interception failed' }, { status: 500 });
        }
      }

      // Passthrough for non-tool calls
      return adapter.originalFetch?.call(globalThis, input, init) ?? fetch(input, init);
    };

    this.wrapped = true;
  }

  shouldWrapTool(url: string): boolean {
    // Simple URL pattern matching
    const path = url.replace(this.baseUrl, '');
    return super.shouldWrapTool(path);
  }

  unwrap(): void {
    if (!this.wrapped) {
      return;
    }

    if (this.originalFetch) {
      globalThis.fetch = this.originalFetch;
    }

    this.originalFetch = null;
    this.wrapped = false;
  }

  isWrapped(): boolean {
    return this.wrapped;
  }
}

export function createGenericAdapter(options: GenericAdapterOptions): GenericAdapter {
  return new GenericAdapter(options);
}
```

### Adapters Package Index (packages/adapters/src/index.ts)

```typescript
export { BaseAdapter, type Adapter, type AdapterOptions } from './base';
export { LangChainAdapter, createLangChainAdapter } from './langchain';
export { LlamaIndexAdapter, createLlamaIndexAdapter } from './llamaindex';
export { VercelAIAdapter, createVercelAIAdapter } from './vercel-ai';
export { GenericAdapter, createGenericAdapter } from './generic';

// Factory function to create adapter by name
import type { ChaosEngine } from '@agent-chaos/core';

export function createAdapter(
  framework: string,
  engine: ChaosEngine,
  options: Record<string, unknown> = {}
) {
  switch (framework) {
    case 'langchain':
      return createLangChainAdapter({ engine, ...options });
    case 'llamaindex':
      return createLlamaIndexAdapter({ engine, ...options });
    case 'vercel-ai':
      return createVercelAIAdapter({ engine, ...options });
    case 'generic':
      return createGenericAdapter({ engine, ...options });
    default:
      throw new Error(`Unknown framework: ${framework}`);
  }
}
```
