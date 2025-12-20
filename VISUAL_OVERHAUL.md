# Visual Overhaul Design Document

> This document defines the visual direction, design principles, and feature requirements for the Apex Assistant UI overhaul.

---

## Core Vision

> **"Built for consumers, but made for business"**

A smooth, modern, delightful experience that happens to be a powerful restoration business tool. No clutter, no page reloads, smooth transitions and animations.

### Inspiration Sources
- **Dash (Nextgear)** - Dealership management workflow
- **PSA (PJM)** - Professional services automation
- **PKM Systems** - Personal knowledge management (Obsidian, Notion)
- **Microsoft To-Do** - My Day concept, flexible personal tasks
- **Samsung Widgets** - Customizable dashboard widgets
- **iPhone Home Screen** - Swipeable views with dot indicators
- **Slack** - Team communication patterns

---

## Key Design Principles

1. **Frictionless** - Minimize clicks/steps, especially for quick capture (ADD-friendly)
2. **Smooth & Modern** - SPA feel, animations, content sliding in/out, no waiting
3. **Customizable** - Users arrange their dashboard to fit their workflow
4. **Role-Based** - Feature-rich but personalized by permissions/access level
5. **Consumer-Grade Polish** - Feels like a well-designed consumer app

---

## Two Primary Workspaces

### Dashboard = Action Hub
The primary workspace where **productivity happens**. Everyone lands here on login.
- Quick capture, task management, scheduling
- Widget-based, user-customizable
- Where you DO things

### Jobs = Reference Hub
Where **information lives** (NOT for productivity).
- All job info consolidated in one view
- Status, estimates, payments, contacts, documents
- Where you LOOK UP things

This separation prevents the common trap of making one screen do everything.

---

## Dashboard Architecture

### Components

| Component | Purpose |
|-----------|---------|
| **Quick Capture/Actions** | One-tap capture: Note, Task, Photo, Audio, Document |
| **Inbox** | Unprocessed captures - disappears once linked to job/person |
| **My Day** | Tasks due today (Microsoft To-Do inspired) |
| **Calendar** | Scheduling and planning |
| **Weather** | Field work planning (snow area) |
| **Project Tasks** | Job-specific compliance tasks assigned to user |
| **Notes** | PKM/Obsidian-style markdown notes |
| **Resources** | Role-specific and company-wide documentation |
| **Team Chat** | Internal messaging (future) |

### Customization
- Users can rearrange dashboard widgets
- Show/hide components based on preference
- Layout persists per user

---

## Two Task Systems

### 1. Job Tasks (Compliance)
For IICRC compliance and accountability - **non-negotiable business requirements**.

- Auto-created from templates when job is created
- **Sequential** - must complete in order
- Deadlines with countdown timers
- Assigned to specific people
- Dependencies required before completion
- Next task auto-starts when previous completes
- Alerts to assignees
- Cannot skip or reorder
- Creates audit trail for insurance disputes

### 2. Personal Tasks
For self-organization - **flexible productivity tools**.

- User-created for self-organization
- Flexible - no forced structure
- Due dates surface in "My Day"
- Inspired by Microsoft To-Do
- Supports job work but separate from compliance

This separation is critical: compliance tasks are rigid requirements, personal tasks are flexible.

---

## Quick Capture Flow

Quick Capture follows GTD (Getting Things Done) principles: **capture friction-free, process later**.

```
User taps Quick Capture → Selects type (Note/Task/Photo/Audio/Doc)
→ Captures content → Closes immediately
→ Item appears in Inbox (unprocessed)
→ User later links to Job/Person → Removed from Inbox (processed)
```

### Global Availability
Quick Capture is a **floating action button (FAB)** that appears on EVERY page.

- Fixed position (bottom-right corner)
- Expands into capture options when tapped
- Available everywhere: Dashboard, Jobs, Chat, Settings
- Closes immediately after capture
- Captured items flow to Inbox

---

## Sidebar Structure (PARA Method)

The sidebar follows the PARA organizational method with contextual content.

### Collapsible Sidebar
- Toggle button to collapse/expand sidebar
- Collapsed state: **icons only** (slim rail with icon buttons)
- Expanded state: full labels + content
- User preference persists across sessions
- Keyboard shortcut support (e.g., Cmd/Ctrl + \)

### Projects Section
- Collapsible list of assigned projects/jobs
- Shows only jobs relevant to current user
- Click opens job dashboard/detail view
- Visual status indicators

### Apps Section
| App | Purpose |
|-----|---------|
| **Notes** | PKM/Obsidian-style markdown notes |
| **Tasks** | Personal task management (My Day) |
| **Calendar** | Scheduling and appointments |

### Resources Section
| Resource | Purpose |
|----------|---------|
| **Inbox** | Unprocessed quick captures |
| **Docs** | Company documentation, SOPs |
| **People** | Contacts database |
| **Services** | Subcontractors, vendors |

---

## Swipeable Dashboard Views

The main dashboard area supports **horizontal swipe navigation** between full-page views (like smartphone home screens).

### View 1: My Hub
- Widget-based layout (Samsung-style)
- Components: Calendar, My Day, Weather, etc.
- User-customizable arrangement
- Default landing view

### View 2: Social
- Slack-style team communication
- Internal messaging
- Activity feed
- @mentions and notifications

### View 3: News
- Company announcements
- Updates and bulletins
- Training materials
- Industry news feed

### Navigation
- Swipe left/right to change views (touch devices)
- Click dot indicators (mouse users)
- Arrow keys (keyboard users)
- Dot indicators at bottom (like iPhone home screen)
- View name in header updates on swipe

---

## Page Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Top Navigation Bar                                 │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ Sidebar  │  Main Content Area                       │
│          │  (Swipeable views on Dashboard)          │
│ Projects │                                          │
│ Apps     │  ● ● ○  (view indicators)                │
│ Resources│                                          │
│          │                                          │
├──────────┴──────────────────────────────────────────┤
│                              [Quick Capture FAB]    │
└─────────────────────────────────────────────────────┘
```

---

## Widget System Design

### Grid Layout
- **12-column grid** with flexible row heights
- Snap-to-grid for both positioning and resizing
- Responsive breakpoints for different screen sizes

### Widget Sizes (Presets)
| Size | Cols × Rows | Example Use |
|------|-------------|-------------|
| Small | 3 × 2 | Weather, clock, quick stats |
| Medium | 6 × 2 | Inbox summary, notifications |
| Large | 6 × 4 | My Day tasks, calendar |
| Wide | 12 × 2 | Full-width announcements |
| Tall | 3 × 4 | Vertical lists |

### Behavior
- **Drag to reposition** - widgets snap to grid
- **Resize handles** - snap to grid units (not pixel-precise)
- **Collision detection** - widgets push each other
- **Internal scrolling** - content scrolls within widget bounds
- **Layout persistence** - save arrangement per user

### Multi-Widget Containers
- Group related widgets in a scrollable container
- Horizontal carousel within a widget frame
- Example: "All Tasks" container with tabs/scroll for different lists

### Library
**react-grid-layout** - handles drag, drop, resize, collision, persistence

---

## Visual Direction

### Color Palette (from apexrestoration.pro)

| Color | Hex (approx) | Usage |
|-------|--------------|-------|
| **Black** | #1a1a1a | Header, nav, hero backgrounds |
| **White** | #FFFFFF | Cards, text on dark |
| **Orange** | #E97A2B | Primary accent, CTAs, links |
| **Light Gray** | #F5F5F5 | Section backgrounds |
| **Green** | #4CAF50 | Success, checkmarks, completed |
| **Blue** | #5BA4E6 | Water damage, info states |
| **Red/Orange** | #E65C2B | Fire damage, warnings |

### Aesthetic Direction

- **Frosted Glass (Glassmorphism)** - Semi-transparent cards with blur backdrop
- **Tasteful Gradients** - Subtle gradients using the orange/black palette
- **Clean & Polished** - Consumer-grade feel for business app
- **Dark Theme Base** - Match website header aesthetic

### Animation Style

- **Subtle & Fast** - 150-200ms transitions
- **Slide transitions** - Content sliding in/out
- **Fade effects** - Smooth opacity changes
- **No jarring movements** - Everything feels fluid

---

## Keyboard Shortcuts (Future)

Once core app flow is established, design comprehensive hotkey system.

**Goals:**
- Power-user efficiency
- Reduce mouse dependency
- Consistent patterns across app

**Potential Categories:**
- Navigation (switch views, toggle sidebar, open apps)
- Quick Capture (instant note, task, photo triggers)
- Actions (save, submit, cancel, search)
- Selection (next/prev item, select all, focus)

**Design Later:** Map out full shortcut scheme after core UX is solid.

---

## Domain Considerations

### Field Work Reality
- Technicians at damaged properties with phones/tablets
- One hand free, possibly wearing gloves
- Bright outdoor conditions
- Poor cell connectivity at times

### Compliance Requirements
- IICRC standards require documentation
- Audit trails with timestamps, who-did-what
- Sequential task completion for accountability

### Multi-Stakeholder Communication
- Property owners (clients)
- Insurance adjusters
- TPAs (Third Party Administrators)
- Subcontractors
- Internal team

### Financial Complexity
- Xactimate estimates
- Supplements and revisions
- Deductibles, ACV vs RCV
- Multiple payment sources

---

## Accessibility Requirements

- Sufficient color contrast (especially with glassmorphism)
- Reduced motion option for animations
- Keyboard navigation throughout
- Screen reader support
- Focus indicators

---

## Implementation Priority

### Phase 1: Foundation
1. Create unified sidebar component (PARA structure)
2. Add global Quick Capture FAB to AppLayout
3. Implement basic swipeable views container

### Phase 2: Visual Polish
1. Apply frosted glass styling to cards
2. Implement color palette from website
3. Add slide/fade transitions (150-200ms)

### Phase 3: Features
1. Build out Social view
2. Build out News view
3. Implement user widget customization

---

## Critical Files to Modify

### Layout Components
- `frontend/src/components/layout/AppLayout.tsx` - Add global Quick Capture FAB
- `frontend/src/components/layout/ChatSidebar.tsx` → Refactor to unified sidebar
- `frontend/src/components/layout/ProjectsSidebar.tsx` → Merge into unified sidebar

### Dashboard
- `frontend/src/pages/DashboardPage.tsx` - Swipeable view container
- `frontend/src/components/dashboard/` - Widget components

### New Components Needed
- `QuickCaptureButton.tsx` - Floating action button
- `QuickCaptureModal.tsx` - Capture options overlay
- `SwipeableViews.tsx` - Horizontal swipe container
- `ViewIndicators.tsx` - Dot navigation
- `UnifiedSidebar.tsx` - PARA-structured sidebar

---

## Next Steps

1. Fix v_projects view (add DROP before CREATE) and create test jobs
2. Explore current component structure to understand refactoring scope
3. Begin Phase 1 implementation with unified sidebar
