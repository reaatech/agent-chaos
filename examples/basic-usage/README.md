# Basic Usage Example

This example demonstrates how to use `@agent-chaos/core` to inject latency faults into tool calls.

## Running

```bash
pnpm install
pnpm tsx examples/basic-usage/index.ts
```

## What it does

1. Creates a chaos engine in `inject` mode.
2. Loads a scenario that adds latency to `search` tool calls.
3. Dispatches a tool call through the engine and prints the response and recorded events.
