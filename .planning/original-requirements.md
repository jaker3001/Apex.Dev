# Apex Assistant - Project Requirements Document

**Project Name:** Apex Assistant
**Folder Name:** `apex-assistant`
**Language:** Python
**Database:** SQLite (local)
**Date Created:** December 15, 2025

---

## 1. Business Context

### About the User
- **Non-technical business owner**
- **Company:** Apex Restoration
- **Industry:** General contracting / Property damage restoration
- **Primary Work:**
  - Property damage claims involving insurance
  - Working with insurance adjusters
  - Writing estimates
  - Revising estimates
  - Justifying line items
  - General business administration (new business owner)

### Core Problem
As a new business owner, there are many administrative tasks that are unfamiliar and time-consuming. The goal is to:
1. Get help with day-to-day workflows
2. Identify tasks with automation potential
3. Offload simple, repetitive tasks to specialized agents
4. Build a system that learns and improves over time

---

## 2. Application Overview

### Vision
A personalized AI assistant with a familiar chat interface that can:
- Converse like a general LLM
- Select and use specific specialized agents
- Upload and process files and images
- Perform tasks on the user's behalf
- Configure connections to MCP servers via a settings menu

### MVP Scope
Start with the **core engine** (backend) using the Claude Agent SDK:
- Conversations with Claude
- MCP server connections (configurable)
- File and image handling
- Task execution capabilities
- Foundation for specialized sub-agents

*Note: The user interface (chat window, buttons, settings menu) will be a future addition.*

---

## 3. Core Features

### 3.1 Chat Interface (Future UI)
- Familiar chat experience (like ChatGPT/Claude)
- Start new conversations
- Select specific agents or use general assistant
- File and image upload capability

### 3.2 Agent System
- **Orchestrator Agent:** Main assistant that understands business context
- **Specialized Sub-Agents:** Purpose-built agents for specific tasks
  - Example: "Estimate Reviewer"
  - Example: "Line Item Justifier"
  - Example: "Adjuster Communication Drafter"

### 3.3 MCP Server Integration
- Settings menu to configure MCP server connections
- Connect to external tools (Google Drive, email, etc.)
- Easy enable/disable of connections

### 3.4 Task Execution
- Perform tasks on user's behalf
- Handle files and documents
- Process images (damage photos, documents)

---

## 4. Database Architecture

### Overview
- **Database Type:** SQLite (completely local)
- **Purpose:** Track all activity, collect metrics, identify automation opportunities
- **Philosophy:** Build a self-improving system that learns from usage patterns

### 4.1 Tables

#### `tasks`
Record of every task requested from the orchestrator agent.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | DATETIME | When task was requested |
| description | TEXT | What was asked |
| status | TEXT | pending, in_progress, completed, failed |
| outcome | TEXT | Result/output summary |
| category | TEXT | Domain category (see below) |
| agent_used | TEXT | Which agent handled it |
| time_to_complete | INTEGER | Seconds to complete |
| ... | ... | Additional metrics (see Section 5) |

#### `conversations`
Chat sessions for context tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| timestamp | DATETIME | Session start time |
| summary | TEXT | Conversation summary |
| related_task_ids | TEXT | Linked task IDs |

#### `agents`
Registry of specialized agents.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Agent name |
| description | TEXT | What it does |
| capabilities | TEXT | List of capabilities |
| times_used | INTEGER | Usage count |
| created_date | DATETIME | When created |
| last_used | DATETIME | Last usage timestamp |

#### `automation_candidates`
Patterns identified for potential automation.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| pattern_description | TEXT | What pattern was detected |
| frequency | INTEGER | How often it occurs |
| suggested_automation | TEXT | Recommended solution |
| automation_type | TEXT | skill, sub-agent, or combo |
| status | TEXT | identified, in_review, implemented, dismissed |

#### `files_processed`
Record of documents and images handled.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| filename | TEXT | Original filename |
| file_type | TEXT | PDF, image, document type |
| task_id | INTEGER | Related task |
| timestamp | DATETIME | When processed |
| purpose | TEXT | Why it was processed |

#### `mcp_connections`
Configured MCP server connections.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | TEXT | Connection name |
| server_type | TEXT | Type of MCP server |
| config | TEXT | Configuration JSON |
| status | TEXT | active, inactive, error |
| last_used | DATETIME | Last usage timestamp |

---

## 5. Metrics Collection

### Purpose
Collect data to determine whether tasks should become:
- **Skill** — A reusable, discrete capability
- **Sub-Agent** — A specialized agent with domain expertise
- **Combo** — A specialized agent that uses specific skills

### Metrics Per Task

| Metric | Type | Description |
|--------|------|-------------|
| complexity_score | INTEGER (1-5) | How complex was the task |
| steps_required | INTEGER | Number of steps to complete |
| decision_points | INTEGER | How many judgment calls needed |
| context_needed | TEXT (low/medium/high) | How much background info required |
| reusability | TEXT (low/medium/high) | Can this exact task be repeated |
| input_type | TEXT | text, file, image, structured_data, multiple |
| output_type | TEXT | What was produced |
| tools_used | TEXT | Which MCP tools/capabilities used |
| human_corrections | INTEGER | Number of times user had to guide/fix |
| follow_up_tasks | INTEGER | Did this spawn additional tasks |
| domain_category | TEXT | Category (see below) |
| time_to_complete | INTEGER | Seconds |
| quality_rating | INTEGER (1-5) | User satisfaction |
| frequency_tag | TEXT | For pattern matching |

### Domain Categories
- `estimates` — Writing, revising estimates
- `line_items` — Justifying line items
- `adjuster_comms` — Communication with adjusters
- `documentation` — Document processing and handling
- `admin` — General business administration
- `research` — Looking up information
- `scheduling` — Calendar and time management
- `financial` — Invoicing, payments, accounting
- `other` — Miscellaneous

---

## 6. Classification Logic

### When to Create a SKILL
- High reusability (same task repeatable)
- Low complexity (1-2)
- Single step or few steps
- Minimal judgment required
- Clear inputs → Clear outputs

**Example:** "Extract line items from a PDF"

### When to Create a SUB-AGENT
- Requires judgment and decision-making
- Multi-step process with branching logic
- Needs context awareness
- Domain expertise required
- Involves back-and-forth interaction

**Example:** "Review this estimate and draft justification responses"

### When to Create a COMBO
- Specialized agent that leverages specific skills
- Complex workflow that combines multiple capabilities
- Domain expert that uses tools

**Example:** "Estimate Agent" that uses:
- PDF extraction skill
- Xactimate lookup skill
- Line item comparison skill

---

## 7. Specialized Agents (Planned)

Based on the business context, potential specialized agents include:

### Estimate Reviewer Agent
- Reviews estimates for completeness
- Identifies missing line items
- Suggests additions based on damage type

### Line Item Justifier Agent
- Drafts justifications for disputed items
- References industry standards
- Creates professional responses

### Adjuster Communication Agent
- Drafts emails and responses to adjusters
- Maintains professional tone
- Tracks communication history

### Admin Assistant Agent
- Helps with business administration tasks
- Answers questions about business operations
- Identifies processes that need attention

### Analyst Agent (Meta-Agent)
- Reviews task database for patterns
- Identifies automation opportunities
- Suggests new skills or agents to create
- Reports on usage metrics

---

## 8. Technical Stack

### Core
- **Language:** Python
- **SDK:** Claude Agent SDK
- **Database:** SQLite
- **Package Manager:** pip

### Future Considerations
- Web UI framework (TBD)
- File storage system
- MCP server integrations

---

## 9. Future Enhancements

### User Interface
- Web-based chat interface
- Settings/configuration panel
- Agent selection menu
- File upload drag-and-drop
- Conversation history view

### Analytics Dashboard
- Task metrics visualization
- Pattern detection reports
- Automation recommendations
- Usage statistics

### Additional Integrations
- Email (for adjuster communications)
- Google Drive / Cloud storage
- Calendar
- Accounting software
- Industry-specific tools (Xactimate, etc.)

---

## 10. Success Criteria

The system is successful when:
1. Tasks can be submitted and executed via chat
2. All tasks are logged to the database with full metrics
3. Files and images can be processed
4. MCP servers can be configured and used
5. Patterns emerge in the data showing automation opportunities
6. Specialized agents can be created based on identified patterns
7. Time spent on repetitive tasks decreases over time

---

## Appendix: Conversation Summary

This document was created based on a requirements gathering conversation where the user described:

1. Being a non-technical business owner of Apex Restoration
2. Wanting a familiar chat interface for interacting with AI
3. The need to handle insurance claims, estimates, and adjuster communications
4. Desire for a local SQLite database to track everything
5. Goal of identifying automation opportunities through data collection
6. Classification system for determining skills vs. sub-agents vs. combos
7. Metrics needed to make intelligent automation decisions

---

*Document created: December 15, 2025*
*Ready for project initialization*
