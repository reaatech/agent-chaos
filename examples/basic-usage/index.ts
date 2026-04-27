import { createChaosEngine } from '@agent-chaos/core';

const engine = createChaosEngine({ mode: 'inject' });

engine.loadScenario({
  name: 'network-degradation',
  targets: [
    {
      selector: 'api.*',
      faults: [
        { type: 'latency', config: { minDelay: 100, maxDelay: 500 }, probability: 0.3 },
        { type: 'timeout', config: { timeout: 3000 }, probability: 0.1 },
      ],
    },
    {
      selector: '*',
      faults: [{ type: 'rateLimit', config: { retryAfter: 30 }, probability: 0.05 }],
    },
  ],
});

async function run(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    const response = await engine.intercept({
      id: String(i + 1),
      name: 'api.search',
      arguments: { query: 'test' },
      timestamp: Date.now(),
    });

    const outcome = response.error ? `FAULT: ${response.error.code}` : 'PASSTHROUGH';
    console.log(`Call ${i + 1}: ${outcome} (${response.duration}ms)`);
  }

  const events = engine.record();
  console.log(`\nRecorded ${events.length} events`);
  for (const event of events) {
    console.log(`  [${event.type}] ${new Date(event.timestamp).toISOString()}`);
  }
}

void run();
