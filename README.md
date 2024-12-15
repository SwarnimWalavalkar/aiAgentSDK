# TypeScript AI Agent Boilerplate

A modern, flexible boilerplate for building AI agents in TypeScript. This project provides a solid foundation for developing intelligent agents with clean architecture and best practices.

## 🚀 Features

- TypeScript-first development
- Modular architecture for easy agent customization
- Built-in tooling and utilities for AI agent development
- Clean and maintainable code structure
- Type safety and modern development practices

## 📋 Prerequisites

- Node.js (v18+)
- Docker (optional for browser automation tools)
- LLM API keys (OpenAI, Anthropic, etc.)

## 🛠️ Installation

$$
1. Clone the repository:

```bash
# Clone the repository
git clone <repository-url>
cd ts-ai-agent-framework

# Install dependencies
pnpm install

# Optional: Start browser service
docker-compose up -d
```

## 🏗️ Project Structure

```
src/
├── agents/           # AI agent implementations
  ├── types.ts        # TypeScript interfaces and types for agents
  ├── exampleAgent/   # Agent implementation
    ├── index.ts      # Entry point for the agent
    ├── basePrompt.md # Base prompt for the agent
├── lib/              # Utility functions
├── orchestrators/    # Orchestrators for agent flows
├── tools/            # Custom tools for AI agents

├── output/           # Output of the agent
├── logs/             # Logs of the agent
```

## 🚦 Getting Started

1. Configure your environment variables:

```bash
cp .env.example .env
```

2. Run the agent flow in `src/index.ts`

```bash
npm run start
```

## 📝 Usage

### Basic Usage

```typescript
import { exampleAgent } from "./src/agents/exampleAgent";

// Create a new agent instance
const agent = exampleAgent();

// Start the agent
agent.run("What is the weather in Tokyo tomorrow?");
```

### With the flow orchestrator

```typescript
import { createFlow } from "./src/orchestrators/flow";

const flow = createFlow({
  agents: [exampleAgent()],
});

const result = await flow.run("What is the weather in Tokyo tomorrow?");
```

## 🤝 Contributing

This project follows the [all-contributors](https://allcontributors.org) specification.
Contributions of any kind are welcome!
