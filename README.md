# Apex Assistant

A personalized AI assistant for Apex Restoration LLC (property damage restoration company) built on the Claude Agent SDK. Provides a web UI with real-time chat (via WebSocket), project management, and tracks metrics for automation opportunity analysis.

## Features

- **AI Chat** - Real-time streaming chat with multiple Claude models (Sonnet 4.5, Opus 4.5, Haiku 4.5)
- **Job/Project Management** - Track restoration jobs, clients, estimates, and payments
- **Structural Drying Tracker** - Monitor drying progress with professional PDF reports
- **Personal Task Management** - To-do lists, inbox capture, and time tracking
- **MCP Server Integrations** - Connect external tools and services
- **Custom Agents and Skills** - Extensible AI capabilities for domain-specific tasks
- **Automation Analytics** - Track metrics to identify automation opportunities

## Prerequisites

- Python 3.10+
- Node.js
- Anthropic API key
- Supabase credentials (URL, anon key, service key)

## Installation

### Backend

```bash
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend && npm install
```

### Git Hooks (Fresh Clone)

```bash
git config core.hooksPath scripts/hooks
```

## Configuration

Create a `.env` file in the project root with the following variables:

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_KEY=eyJhbGc...
```

> **Note:** Never commit the `.env` file to version control.

## Running the App

### Backend

```bash
python run_server.py
```

The API server runs on port 8000.

### Frontend

```bash
cd frontend && npm run dev
```

The development server runs on port 5173.

## Project Structure

```
apex-assistant/
├── api/                    # FastAPI backend
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   └── schemas/            # Pydantic models
├── database/               # Database schemas and operations
├── config/                 # Configuration files
├── mcp_manager/            # MCP server connections
├── frontend/               # React SPA
│   └── src/
│       ├── pages/          # Route components
│       ├── components/     # UI components
│       └── lib/            # Utilities and clients
├── scripts/hooks/          # Git hooks
└── run_server.py           # Production server entry
```

## Tech Stack

### Backend
- FastAPI
- Python
- Claude Agent SDK

### Frontend
- React 19
- Vite 7
- TailwindCSS 4
- React Query
- Zustand

### Database
- Supabase (PostgreSQL)

### Real-time
- WebSocket

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Development guidelines and architecture details
- [GIT_WORKFLOW.md](./GIT_WORKFLOW.md) - Git workflow reference

## License

All rights reserved. Proprietary software for Apex Restoration LLC.
