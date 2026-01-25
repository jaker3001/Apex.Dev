# Apex Assistant Roadmap

> Single source of truth for project status. For detailed feature specs, see `FEATURES-SPEC.md`.

---

## Quick Status

| Feature | Status | Notes |
|---------|--------|-------|
| Chat/AI Assistant | ✅ | WebSocket streaming, multi-model, history |
| Jobs/Projects | ✅ | Full CRUD, detail tabs, accounting, contacts |
| Tasks | ✅ | Lists, My Day, important, planned, subtasks |
| Structural Drying | ✅ | Setup wizard, readings, psychrometric calcs, PDF reports |
| Calendar | 🟡 | Google OAuth working, view functional; needs two-way sync polish |
| Dashboard | 🟡 | Page exists with widgets; needs real data connections |
| Notes/PKM | 🔴 | Route exists, no UI |
| Areas/Tags | 🔴 | Not started |
| Personal Projects | 🔴 | Spec exists in FEATURES-SPEC.md, not implemented |

**Legend:** ✅ Complete | 🟡 In Progress/Partial | 🔴 Not Started

---

## Current Focus

**Dashboard Data Integration**
- Connect dashboard widgets to real Tasks API (currently mock data)
- Calendar widget showing actual events
- Recent activity pulling from real sources

**Calendar Two-Way Sync**
- Polish Google Calendar integration
- Event creation from Apex → Google
- Handle sync conflicts gracefully

---

## Next Up

### Notes & Knowledge Management (PKM)
Build out the Notes feature with:
- Markdown editor with WYSIWYG
- Bi-directional linking (`[[Note Name]]` syntax)
- Quick capture to inbox
- AI-assisted organization and summarization

### Areas/Tags System
Foundation for organizing across all features:
- Create/manage areas (PARA methodology)
- Tag tasks, notes, projects with areas
- Area views aggregating related items

---

## Backlog

Ideas from `IDEAS.md` not yet prioritized:

- Xactimate PDF parsing and analysis
- Voice-to-task capture
- Automated adjuster email drafting
- Equipment tracking and maintenance
- Subcontractor management
- Customer communication templates
- Mobile/PWA experience
- Time tracking
- Goals with milestones

---

## Completed Phases

### Phase 1: Initial Build (Dec 2024 - Jan 2025)
- FastAPI backend with WebSocket chat
- React 19 frontend with TailwindCSS 4
- SQLite → Supabase hybrid migration
- Repository pattern for database abstraction

### Phase 2: Core Features (Jan 2025)
- Job/Project management with full CRUD and detail tabs
- Structural drying tracker with psychrometric calculations
- Task management system (GTD-compatible)
- Multi-model support (Sonnet, Opus, Haiku)
- Google OAuth flow for calendar

### Phase 3: Polish & Organization (Jan 2025)
- Repository cleanup and documentation organization
- `.planning/` directory as project hub
- Consolidated roadmap tracking (this file)

---

*Last updated: January 2025*
