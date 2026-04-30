# @reaatech/agent-chaos-observability

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/agent-chaos/blob/main/LICENSE)

> **Status:** Planned — v0.2.0. Not yet published. APIs subject to change.

Structured logging, metrics collection, OpenTelemetry tracing, and chaos experiment report generation for agent-chaos. Provides a single observability surface for understanding fault injection impact, tracking resilience patterns, and generating reports for compliance and sharing.

## Installation

```bash
npm install @reaatech/agent-chaos-observability
# or
pnpm add @reaatech/agent-chaos-observability
```

> This package is under active development and not included in the v0.1.0 release.

## Feature Overview

- **Structured logging** — JSON and text output with configurable levels (debug, info, warn, error) and file destination support
- **Metrics collection** — fault injection counts by type, tool success/failure rates, latency distributions, recovery time measurements
- **OpenTelemetry tracing** — distributed tracing spans across tool calls, fault injections, and engine lifecycle events
- **Report generators** — JSON, HTML (with visualizations), and JUnit XML formats for CI integration
- **Popular provider integrations** — native hooks for Prometheus, Datadog, and New Relic
- **Real-time dashboard** — optional web UI for live chaos experiment monitoring

## Planned Architecture

```
┌─────────────────────┐
│   Chaos Engine      │
│   • intercept()     │
│   • loadScenario()  │
└─────────┬───────────┘
          │ emits events
          ▼
┌─────────────────────┐
│   Observability     │
│   • MetricsCollector│
│   • Tracer          │
│   • ReportGenerator │
└─────────┬───────────┘
          ▼
    Prometheus / Datadog / Console
```

## Related Packages

- [`@reaatech/agent-chaos-core`](https://www.npmjs.com/package/@reaatech/agent-chaos-core) — Core fault injection engine (emits the events)
- [`@reaatech/agent-chaos-scenarios`](https://www.npmjs.com/package/@reaatech/agent-chaos-scenarios) — Scenario loader and validator
- [`@reaatech/agent-chaos-cli`](https://www.npmjs.com/package/@reaatech/agent-chaos-cli) — Command-line interface

## License

[MIT](./LICENSE)
