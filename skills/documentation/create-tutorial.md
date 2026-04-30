# Skill: create-tutorial

## Description

Write step-by-step tutorials that guide users through using agent-chaos for specific use cases. This skill creates comprehensive learning materials with explanations, code samples, and exercises.

## Prerequisites

- Core packages implemented
- Examples created
- API documentation available

## Input Parameters

| Parameter  | Type   | Required | Description                                                                    |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------ |
| topic      | string | yes      | Tutorial topic (e.g., "getting-started", "custom-injectors")                   |
| difficulty | string | no       | Difficulty level: 'beginner', 'intermediate', 'advanced' (default: 'beginner') |
| duration   | number | no       | Estimated duration in minutes (default: 30)                                    |

## Execution Steps

1. Define learning objectives
2. Create tutorial outline
3. Write introduction and prerequisites
4. Document step-by-step instructions
5. Add code samples and explanations
6. Include exercises and challenges
7. Add troubleshooting section
8. Create summary and next steps

## Output

- Complete tutorial document
- Code samples
- Exercises with solutions
- Prerequisites checklist

## Example Usage

```
Please execute the "create-tutorial" skill with:
- topic: "getting-started"
- difficulty: "beginner"
- duration: 45
```

## Implementation

### Tutorial Template Structure

```markdown
# Tutorial: [Tutorial Title]

## Overview

**What you'll learn:**

- Learning objective 1
- Learning objective 2
- Learning objective 3

**Duration:** [X] minutes

**Difficulty:** [Beginner/Intermediate/Advanced]

## Prerequisites

Before starting this tutorial, you should:

- [ ] Have Node.js 20+ installed
- [ ] Have pnpm 9+ installed
- [ ] Understand [concept]
- [ ] Complete [previous tutorial]

## Step 1: [Step Title]

[Explanation of what this step accomplishes]

### Code Example

\`\`\`typescript
// Code here
\`\`\`

### Explanation

[Detailed explanation of the code]

## Step 2: [Step Title]

[Continue with more steps...]

## Exercise

Try this on your own:

- Task 1
- Task 2

### Solution

\`\`\`typescript
// Solution code
\`\`\`

## Troubleshooting

### Issue: [Common issue]

**Solution:** [How to fix]

## Summary

In this tutorial, you learned:

- Key takeaway 1
- Key takeaway 2
- Key takeaway 3

## Next Steps

- [Related tutorial 1](link)
- [Related tutorial 2](link)
- [API Reference](link)
```

### Tutorial Categories

1. **Getting Started**
   - Introduction to Chaos Engineering for Agents
   - Your First Chaos Scenario
   - Understanding Fault Injection

2. **Intermediate Tutorials**
   - Creating Custom Injectors
   - Framework Integration (LangChain, LlamaIndex)
   - Scenario Design Patterns

3. **Advanced Tutorials**
   - Building Production Chaos Tests
   - CI/CD Integration
   - Performance Testing with Chaos

### Tutorial Examples

#### Getting Started Tutorial (docs/tutorials/getting-started.md)

```markdown
# Getting Started with Agent Chaos

Welcome to agent-chaos! In this tutorial, you'll learn how to set up chaos
engineering for your agent system and run your first fault injection scenario.

## What You'll Learn

- How to install and configure agent-chaos
- How to create and run a basic chaos scenario
- How to interpret chaos test results

## Prerequisites

- Node.js 20+ and pnpm 9+ installed
- Basic understanding of TypeScript
- An agent system (we'll use a simple example)

## Step 1: Install Agent Chaos

\`\`\`bash
pnpm add @reaatech/agent-chaos-core @reaatech/agent-chaos-scenarios
\`\`\`

## Step 2: Create Your First Scenario

Create a file called `chaos-scenario.yaml`:

\`\`\`yaml
name: My First Chaos Scenario
description: Testing basic fault injection

targets:

- selector: "\*"
  faults: - type: latency
  config:
  minDelay: 1000
  maxDelay: 2000
  probability: 0.5
  \`\`\`

## Step 3: Run the Chaos Test

\`\`\`typescript
import { createChaosEngine } from '@reaatech/agent-chaos-core';
import { createScenarioLoader } from '@reaatech/agent-chaos-scenarios';

async function runChaosTest() {
const engine = createChaosEngine();
const loader = createScenarioLoader();

const scenario = await loader.load('./chaos-scenario.yaml');
engine.loadScenario(scenario);

// Your agent tool calls here...
}
\`\`\`

[Continue with more detailed steps...]
```
