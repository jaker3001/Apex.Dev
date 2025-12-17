# User Dashboard Feature

## Overview

A personal productivity dashboard for logged-in employees at Apex Restoration. This is the landing page users see after authentication, providing a centralized hub for their work and personal organization.

## Core Components

### 1. My Jobs
- Jobs specifically assigned to the logged-in user
- Quick status overview and access to job details
- Filtered view of projects from `apex_operations.db` based on user assignment

### 2. Personal Task Manager
- **Separate from project/job tasks** — this is for personal productivity
- User creates and manages their own tasks
- Not tied to IICRC compliance or job requirements
- Flexible organization (lists, tags, priorities, due dates)

### 3. Personal Notes / Knowledge Management
- Create, edit, and organize notes
- File attachments and storage
- Personal reference material
- Searchable knowledge base

### 4. Calendar
- Personal calendar view
- May integrate with job deadlines and appointments
- User-managed events and reminders

## Technical Considerations

### Authentication Dependency
- Requires user login system (JWT auth exists in `api/routes/auth.py`)
- Dashboard content is user-specific
- Need user identity to filter jobs and store personal data

### Database
- Personal tasks, notes, and files need storage
- Options:
  - New tables in `apex_assistant.db` (user-specific data)
  - Or new tables in `apex_operations.db` if tightly coupled to jobs
- User assignment to jobs needs to be tracked (likely `project_contacts` table with role)

### Frontend
- New route: `/dashboard` (or make it the default `/` after login)
- Components needed:
  - `DashboardPage.tsx`
  - `MyJobs.tsx`
  - `PersonalTasks.tsx`
  - `PersonalNotes.tsx`
  - `PersonalCalendar.tsx`

## User Experience Goals

- **Personal space** — feels like "my" area, not just company data
- **At-a-glance overview** — see what needs attention immediately
- **Quick capture** — easy to jot notes or add tasks without friction
- **Productivity-focused** — helps employees stay organized and effective

## Future Enhancements

- Widgets/customizable dashboard layout
- Quick actions (clock in, start drying log, upload photos)
- Notifications and alerts
- Integration with external calendars (Google Calendar)
