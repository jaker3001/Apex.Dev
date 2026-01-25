# Apex Assistant Roadmap

> For detailed feature specifications, see `FEATURES-SPEC.md` in this directory.

---

## Current Phase: Core Platform Stabilization

**Goal:** Ensure the foundational features are reliable and well-integrated before adding new capabilities.

**Status:** In Progress

### Active Work
- [ ] Repository cleanup and documentation organization
- [ ] Google Calendar integration completion
- [ ] Dashboard widgets polish

### Recently Completed
- [x] Supabase migration (hybrid approach with SQLite)
- [x] WebSocket-based real-time chat with Claude
- [x] Job/Project management with full CRUD
- [x] Structural drying tracker with psychrometric calculations
- [x] Task management system (GTD-compatible)
- [x] Multi-model support (Sonnet, Opus, Haiku)
- [x] Repository pattern for database abstraction

---

## Upcoming Phases

### Phase: Calendar & Scheduling
**Goal:** Unified calendar view with job scheduling, personal tasks, and external calendar sync.
**Priority:** High
**Dependencies:** Google OAuth flow (in progress)

Features:
- Google Calendar two-way sync
- Job scheduling on calendar
- Task due dates on calendar
- Drag-and-drop rescheduling

### Phase: Notes & Knowledge Management (PKM)
**Goal:** Personal knowledge base with bi-directional linking and AI-assisted organization.
**Priority:** Medium
**Dependencies:** Core platform stable

Features:
- Markdown notes with WYSIWYG editor
- Bi-directional linking (`[[Note Name]]` syntax)
- Quick capture to inbox
- AI-powered note summarization and connections

### Phase: Analytics & Insights
**Goal:** Business intelligence for identifying automation opportunities and tracking profitability.
**Priority:** Medium
**Dependencies:** Sufficient historical data

Features:
- Job profitability analysis
- Time tracking patterns
- Automation opportunity detection (repeated manual tasks)
- Custom dashboards

### Phase: Mobile Experience
**Goal:** Native mobile app or PWA for field work.
**Priority:** Low (after desktop is mature)
**Dependencies:** API stability, offline-first architecture

Features:
- Quick capture on mobile
- Photo uploads from field
- Offline mode with sync
- Push notifications

---

## Backlog (Unprioritized)

Ideas from `.planning/IDEAS.md` that need evaluation:

- Xactimate PDF parsing and analysis
- Voice-to-task capture
- Automated adjuster email drafting
- Equipment tracking and maintenance
- Subcontractor management
- Customer communication templates

---

## Phase History

### Completed: Initial Build (Dec 2024 - Jan 2025)
- FastAPI backend with WebSocket chat
- React 19 frontend with TailwindCSS 4
- SQLite → Supabase hybrid migration
- Job management, drying tracker, task system

---

*Last updated: January 2025*
