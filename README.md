# WhatsApp + Grok Bot

[![CI](https://github.com/ivamartins/whatsapp-grok-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/ivamartins/whatsapp-grok-bot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-20%2B-green)](https://nodejs.org/)

> Historical variant of [whatsapp-llm-bot](https://github.com/ivamartins/whatsapp-llm-bot). Demonstrates the **Grok CLI** integration with custom agent + skill (defined inside the project). Kept as a reference for `spawn`-based LLM integrations.

Bot that listens to WhatsApp messages and uses **Grok with custom agent + skills** to generate intelligent replies automatically.

## Why this project exists

This is the **historical** version of the WhatsApp bot — it uses the **Grok CLI** with `.grok/agents` and `.grok/skills` defined inside the project (`cwd`-relative). The **maintained** version is [whatsapp-llm-bot](https://github.com/ivamartins/whatsapp-llm-bot), which is LLM-agnostic (any OpenAI-compatible HTTP API) and easier to extend.

Kept here as a reference for:
- `spawn`-based LLM CLI integration
- Custom agent + skill definitions (MCP-style, declared in `.grok/`)
- Portability — the "brain" (agent + skills) travels with the code

## Architecture

```
whatsapp-grok-bot/
├── index.js                       # Baileys listener → spawns grok CLI
├── .grok/
│   ├── agents/
│   │   └── whatsapp-responder.md   # custom agent definition
│   └── skills/
│       ├── data/                   # custom skill (lookup)
│       └── legacy-query/           # custom skill (query old Java/Play/Scala)
├── auth/                           # Baileys session (persisted)
├── tests/                          # 61 tests, no real LLM/WhatsApp
└── package.json
```

The bot:
1. Listens to incoming WhatsApp messages via Baileys
2. Calls the Grok CLI with `cwd` pointing to this project (so `.grok/agents/` is discovered)
3. Returns the response to the user

## Quick start

**Prerequisites:** Node 18+ and a WhatsApp account.

```bash
# 1) Install
npm install

# 2) Configure
cp .env.example .env
# Edit .env: GROK_API_KEY=...

# 3) Run
npm start
```

Scan the QR code once. The bot will start replying using the custom `whatsapp-responder` agent + skills.

## Run the tests

```bash
npm test
```

61 tests, no real LLM/WhatsApp/Grok. Run in < 100 ms.

## Customizing the brain

Edit the agent in `.grok/agents/whatsapp-responder.md` or add new skills in `.grok/skills/`. The "brain" travels with the code — no external config needed.

## Extending for real use

- Add skills for your domain (e.g., `legacy-query` for querying old systems)
- Add memory (RAG over past conversations)
- Replace Grok CLI with the LLM-agnostic stack from `whatsapp-llm-bot`

## Deploy

- **Docker**: `docker build -t whatsapp-grok-bot . && docker run --env-file .env whatsapp-grok-bot`
- **PM2**: `pm2 start index.js --name whatsapp-bot`
- **systemd**: see the Portuguese README for a sample unit file

> **Português?** Veja [`README.pt-BR.md`](./README.pt-BR.md).

## See also

- **Maintained version**: [whatsapp-llm-bot](https://github.com/ivamartins/whatsapp-llm-bot) (LLM-agnostic)
- **Product line**: [Conversational AI Bots](https://ivamartins.github.io/code-solutions-site/#produtos)
- **Code Solutions on LinkedIn**: [linkedin.com/company/code-solutions-it](https://www.linkedin.com/company/code-solutions-it/)
- **All Code Solutions open source**: [github.com/ivamartins](https://github.com/ivamartins)

## License

MIT — see `LICENSE`.
