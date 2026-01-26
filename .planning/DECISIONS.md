# Decision Log

> Record important technical and product decisions so future-you (and Claude) understand *why* things are the way they are.

---

## Template

```
### [Date] - [Decision Title]
**Context:** What was the situation?
**Decision:** What did we decide?
**Alternatives Considered:** What else did we consider?
**Rationale:** Why this choice?
**Consequences:** What are the tradeoffs?
```

---

## December 2024 - Hybrid Database Architecture

**Context:** Started with SQLite for simplicity, but needed auth, real-time subscriptions, and Row Level Security for future multi-user support.

**Decision:** Hybrid approach - keep SQLite for legacy operations, add Supabase (PostgreSQL) for newer features. Use repository pattern to abstract database access.

**Alternatives Considered:**
1. Full migration to Supabase (risky, lots of work)
2. Stay on SQLite only (limits future capabilities)
3. Use Firebase (vendor lock-in concerns)

**Rationale:** Incremental migration reduces risk. Supabase provides auth, RLS, real-time, and edge functions. Repository pattern means we can migrate tables gradually without changing API code.

**Consequences:** Two database systems to maintain during transition. Need to be careful about cross-database queries (use application-level joins).

---

## December 2024 - WebSocket for Chat vs HTTP Streaming

**Context:** Needed to stream AI responses in real-time for good UX.

**Decision:** Use WebSocket connections for chat with full message protocol.

**Alternatives Considered:**
1. Server-Sent Events (SSE) - simpler but one-way
2. HTTP long-polling - works but clunky
3. WebSocket - full duplex, can send tool use updates

**Rationale:** WebSocket allows bidirectional communication, which enables sending tool use status, typing indicators, and other real-time features. Claude SDK streams well over WebSocket.

**Consequences:** More complex connection management. Need reconnection logic. But provides best UX for AI chat.

---

## January 2025 - Git Worktrees for Parallel Development

**Context:** Want to run multiple Claude Code agents working on different features simultaneously.

**Decision:** Use git worktrees for feature branches, stored in `.worktrees/` directory.

**Alternatives Considered:**
1. Just switch branches (breaks parallel work)
2. Clone multiple copies of repo (disk space, sync issues)
3. Stacked PRs/branches (complex for independent features)

**Rationale:** Worktrees are git's native solution for parallel development. Each worktree has isolated file state but shares .git directory. Perfect for running 2-3 agents on different features.

**Consequences:** Need to remember to clean up worktrees after merging. Must be careful not to modify same files in parallel worktrees.

---

## January 2025 - Repository Pattern for Data Access

**Context:** Mixing raw SQL queries, Supabase client calls, and ORM-style access made code hard to maintain.

**Decision:** Implement repository pattern with `BaseRepository` providing generic CRUD, specialized repositories adding domain logic.

**Alternatives Considered:**
1. Continue ad-hoc queries (tech debt accumulation)
2. Full ORM like SQLAlchemy (heavy for our needs)
3. Repository pattern (clean abstraction, testable)

**Rationale:** Repository pattern gives clean interfaces without ORM complexity. Easy to mock for testing. Encapsulates Supabase-specific logic. Can swap implementations if needed.

**Consequences:** More boilerplate for simple operations. But consistency and testability are worth it.

---

## January 2025 - Supabase-Only Migration

**Context:** Hybrid SQLite + Supabase architecture created complexity. Two databases to maintain, cross-database queries needed application-level joins, and SQLite blocked features like Row Level Security.

**Decision:** Complete migration to Supabase-only. Remove all SQLite databases and operations files.

**Alternatives Considered:**
1. Continue hybrid (complexity and maintenance burden)
2. Migrate to different PostgreSQL (lose Supabase auth, real-time, edge functions)
3. Full Supabase (clean architecture, single source of truth)

**Rationale:** Single database simplifies everything - development, deployment, backups, queries. Supabase provides production-ready auth, RLS, real-time subscriptions, and edge functions. Worth the one-time migration effort.

**Consequences:** Need migration script. Breaking change for existing data. But results in cleaner, more maintainable architecture.

---

## January 2025 - Supabase Auth with Simple Roles

**Context:** Need authentication for multi-user access. Considered complex RBAC with permissions tables.

**Decision:** Use Supabase Auth with simple role-based access: `owner` (full access) and `employee` (limited). Role stored in `dashboard.user_profiles` table.

**Alternatives Considered:**
1. Custom JWT auth (reinventing the wheel)
2. Complex RBAC with permissions tables (over-engineering)
3. Supabase Auth + simple roles (right-sized for current needs)

**Rationale:** Only two users initially (Jake as owner, potentially employees later). Complex RBAC would be premature optimization. Supabase Auth handles the hard parts (password hashing, token refresh, email verification). Easy to add more roles later if needed.

**Consequences:** Can't do fine-grained permissions without code changes. But simple role checks (`require_owner` dependency) cover 95% of cases.

---

## January 2025 - Jobs vs Projects Separation

**Context:** Both business (restoration jobs) and personal (projects) need tracking. Initially used "projects" for business jobs.

**Decision:** Rename business projects to "jobs" (`business.jobs`), keep "projects" for personal use (`dashboard.projects`). Completely separate tables with different schemas.

**Alternatives Considered:**
1. Single table with `type` field (mixing concerns)
2. Keep both named "projects" (confusing)
3. Clear separation: jobs for business, projects for personal (clarity)

**Rationale:** Business jobs and personal projects have very different fields. Jobs need: damage category, claim numbers, client relationships, estimate tracking. Personal projects need: PARA tags, goals, accounting modes. Separation allows each to evolve independently.

**Consequences:** Two codepaths for "project-like" entities. But cleaner mental model and schemas.

---

## January 2025 - Two People Tables (Business vs Personal)

**Context:** Need to track contacts. Business contacts (adjusters, vendors) have very different data than personal contacts (friends, family, mentors).

**Decision:** Separate tables: `business.contacts` for business relationships, `dashboard.people` for personal relationships.

**Alternatives Considered:**
1. Single contacts table with type field (awkward schema)
2. Separate tables (clean separation of concerns)

**Rationale:** Business contacts need: organization relationships, project roles, MSA tracking. Personal contacts need: relationship types, check-in reminders, birthday tracking, personal notes. Different enough to warrant separate schemas.

**Consequences:** Can't easily search across both tables. But this is intentional - they serve different purposes.

---

## January 2025 - Polymorphic Note Linking

**Context:** Notes should be able to link to multiple entity types (tasks, projects, people, jobs, events).

**Decision:** Use polymorphic `note_links` table with `linkable_type` and `linkable_id` columns instead of separate foreign key columns.

**Alternatives Considered:**
1. Separate FK columns for each entity type (schema changes for new types)
2. JSON array of links (loses referential integrity)
3. Polymorphic link table (flexible, queryable)

**Rationale:** Polymorphic pattern allows notes to link to any entity without schema changes. Index on `(linkable_type, linkable_id)` enables efficient queries from either direction. Pattern used successfully in Rails and Django.

**Consequences:** Can't use database FKs for integrity. But application-level validation is acceptable tradeoff for flexibility.

---

## January 2025 - Ultimate Brain-Inspired Note Types

**Context:** Notes could be just freeform text, but Ultimate Brain (Notion template) shows value of typed notes with specific fields.

**Decision:** Implement full note type system: note, journal, meeting, web_clip, idea, reference, voice_note, book, lecture, plan, recipe. Each type has type-specific fields (source_url for web_clip, duration_seconds for voice_note, etc.).

**Alternatives Considered:**
1. Simple notes only (lost opportunity for organization)
2. Full note types with dedicated tables (too many tables)
3. Note types with optional type-specific fields (right balance)

**Rationale:** Single table with optional fields is simpler than separate tables. Note types provide organizing structure without complexity. Can add new types by adding enum value and optional fields.

**Consequences:** Some notes have unused fields. But cleaner than joins and provides meaningful type distinctions.

---

## January 2025 - Future Fork Strategy (Personal vs Enterprise)

**Context:** Building for Jake's personal use, but might want to offer to other restoration companies later.

**Decision:** Build once with both personal (Second Brain) and business (Apex) features. Design for future fork into personal-only and enterprise versions if demand materializes.

**Alternatives Considered:**
1. Build business-only (lose Second Brain vision)
2. Build personal-only (lose business value)
3. Build both, fork later (maximize optionality)

**Rationale:** The features don't conflict - personal productivity enhances business productivity. Keeping both in one codebase is simpler now. If there's demand for enterprise-only version, can fork and strip personal features. No premature optimization for hypothetical future.

**Consequences:** Codebase has features not needed by potential enterprise customers. But maintaining one codebase is easier than two until there's real demand for separation.

---

*Add new decisions above this line*
