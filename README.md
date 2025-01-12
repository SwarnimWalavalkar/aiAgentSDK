# [🚧 WIP] TypeScript AI Agent Boilerplate

A modern, flexible boilerplate for building AI agents in TypeScript. This project provides a solid foundation for developing intelligent agents with clean architecture and best practices.

## 🚀 Features

- TypeScript-first development
- Modular architecture for easy agent customization
- Built-in tooling and utilities for AI agent development
- Clean and maintainable code structure
- Type safety and modern development practices

## 📋 Prerequisites

- Node.js (v20+)
- Docker (optional for browser automation tools)
- LLM API keys (OpenAI, Anthropic, etc.)

## 🛠️ Getting Started

Project Setup:

```bash
# Install dependencies
pnpm install

# Optional: Start browser service
docker-compose up -d
```

Configure your environment variables:

```bash
cp .env.example .env
```

## 🚦 Getting Started

Run the agent flow in `src/index.ts`

```bash
pnpm run start
```

## 🏗️ Project Structure

```
src/
├── agents/           # AI agent implementations
  ├── core/           # Core agent abstraction
  ├── exampleAgent/   # Agent implementation
    ├── index.ts      # Agent definition
    ├── basePrompt.md # Base prompt for the agent
├── lib/              # Common utilities
├── orchestrators/    # Orchestrators for agent flows
├── tools/            # Custom tools for AI agents

├── output/           # Output of the agent
├── logs/             # Logs of the agent
```

## 🤝 Contributing

This project follows the [all-contributors](https://allcontributors.org) specification.
Contributions of any kind are welcome!
