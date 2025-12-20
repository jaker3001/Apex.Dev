# Apex Assistant - GEMINI.md

This file provides context and instructions for Gemini when working with the Apex Assistant repository.

## Project Overview

**Apex Assistant** is a personalized AI assistant for Apex Restoration LLC, a property damage restoration company. It helps manage business operations, tracking metrics, and automating tasks. The system is built using the **Claude Agent SDK** (backend) and **React** (frontend).

## Tech Stack

*   **Backend:** Python 3.10+, FastAPI, Claude Agent SDK, SQLite, WebSocket.
*   **Frontend:** React 19, Vite 7, TailwindCSS 4, React Query, Zustand.
*   **Infrastructure:** Docker (optional), MCP (Model Context Protocol).

## Key Commands

### Backend
*   **Start API Server:** `python run_server.py` (Runs on port 8000)
*   **Initialize Database:** `python main.py --init-db`
*   **Interactive CLI:** `python main.py`
*   **Setup Example MCP:** `python main.py --setup-mcp`

### Frontend
*   **Start Development Server:** `cd frontend && npm run dev` (Runs on port 5173+)
*   **Build for Production:** `cd frontend && npm run build`
*   **Lint:** `cd frontend && npm run lint`

## Architecture

The project is structured as follows:

*   **`api/`**: FastAPI application core.
    *   `main.py`: App entry point, CORS, router registration.
    *   `routes/`: API endpoints (`chat`, `projects`, `agents`, etc.).
    *   `services/`: Business logic (e.g., `chat_service.py` wrapping Claude SDK).
    *   `schemas/`: Pydantic models for data validation.
*   **`frontend/`**: React Single Page Application (SPA).
    *   `src/pages/`: Route components.
    *   `src/components/`: Reusable UI components.
    *   `src/contexts/`: React context (e.g., `ChatContext`).
*   **`database/`**: Database schemas and operations.
    *   `schema.py`: Schema for `apex_assistant.db` (metrics, chat history).
    *   `schema_apex.py`: Schema for `apex_operations.db` (business data: projects, clients).
*   **`mcp_manager/`**: Manages Model Context Protocol (MCP) server connections.
*   **`config/`**: Configuration files, including `system_prompt.py`.

## Databases

The system utilizes two SQLite databases:

1.  **`apex_assistant.db`**: Stores internal assistant data.
    *   Tables: `tasks`, `conversations`, `messages`, `agents`, `automation_candidates`.
2.  **`apex_operations.db`**: Stores business data for Apex Restoration.
    *   Tables: `projects` (Jobs), `clients`, `organizations`, `contacts`, `estimates`.

**Note:** When connecting to `apex_operations.db`, ensure foreign keys are enabled: `conn.execute('PRAGMA foreign_keys = ON')`.

## Development Conventions

*   **Reference:** Always check `CLAUDE.md` for the most up-to-date architectural details and Git workflow.
*   **Code Style:** Follow existing Python (PEP 8) and React standards.
*   **Validation:** Use **Pydantic** for all API request/response validation.
*   **Synchronization:** Ensure Frontend and Backend changes are kept in sync (e.g., if adding an API field, update the UI to support it).
*   **Async/Await:** Use async/await patterns for I/O operations in both Python and JavaScript.

## Environment Variables

*   `ANTHROPIC_API_KEY`: Required for the backend to function.
*   See `.env` (or create one) for local configuration.
