# @reaatech/agent-chaos-adapters

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-chaos/blob/main/LICENSE)

> **Status:** Planned — v0.2.0. Not yet published. APIs subject to change.

Framework adapters for integrating agent-chaos with popular agent frameworks through a transparent interceptor pattern — no changes to your agent code required.

## Installation

```bash
npm install @reaatech/agent-chaos-adapters
# or
pnpm add @reaatech/agent-chaos-adapters
```

> This package is under active development and not included in the v0.1.0 release.

## Feature Overview

- **LangChain adapter** — tool wrapper and callback handler integration
- **LlamaIndex adapter** — tool spec wrapping and query engine integration
- **Vercel AI SDK adapter** — tool registration wrapping and stream handling
- **Generic/REST adapter** — any custom agent with a tool-call interface
- **Single interceptor pattern** — all adapters share a common `Adapter` interface
- **Transparent injection** — fault injection runs between your agent and its tools without modifying agent code

## Planned Architecture

```
Agent Code
    │
    ▼
┌─────────────────────┐
│   Chaos Adapter     │  ← Framework-specific interceptor (LangChain, LlamaIndex, Vercel AI SDK, etc.)
│   • wraps tools     │
│   • intercepts calls│
└─────────┬───────────┘
          ▼
┌─────────────────────┐
│   Chaos Engine      │
│   • fault selection │
│   • injector chain  │
└─────────────────────┘
```

## Planned Adapters

| Adapter | Framework | Maturity |
|---------|-----------|----------|
| **LangChain** | Tool wrapper + callback handler | Planned |
| **LlamaIndex** | Tool spec wrapping + query engine | Planned |
| **Vercel AI SDK** | Tool registration wrapping + stream handling | Planned |
| **Generic / REST** | Custom agent with a tool-call interface | Planned |

## Related Packages

- [`@reaatech/agent-chaos-core`](https://www.npmjs.com/package/@reaatech/agent-chaos-core) — Core fault injection engine
- [`@reaatech/agent-chaos-scenarios`](https://www.npmjs.com/package/@reaatech/agent-chaos-scenarios) — Scenario loader and validator
- [`@reaatech/agent-chaos-cli`](https://www.npmjs.com/package/@reaatech/agent-chaos-cli) — Command-line interface

## License

[MIT](./LICENSE)
