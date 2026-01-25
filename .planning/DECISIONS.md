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

*Add new decisions above this line*
