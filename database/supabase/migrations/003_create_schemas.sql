-- =====================================================================
-- Migration 003: Create Database Schemas
-- =====================================================================
-- Purpose: Create separate schemas for dashboard (personal) and business data
-- Dependencies: 002_create_enums.sql
-- Rollback: DROP SCHEMA IF EXISTS <schema_name> CASCADE;
-- =====================================================================

-- =====================================================================
-- Dashboard Schema (Personal Productivity)
-- =====================================================================
-- Contains: users, tasks, projects, notes, tags, goals, people,
--           work_sessions, user_integrations, conversations, ai_tasks
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS dashboard;

COMMENT ON SCHEMA dashboard IS 'Personal productivity data: tasks, projects, notes, tags (PARA), goals, AI assistant';

-- =====================================================================
-- Business Schema (Restoration Operations)
-- =====================================================================
-- Contains: jobs, clients, organizations, contacts, estimates, payments,
--           job_notes, media, receipts, work_orders, labor_entries
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS business;

COMMENT ON SCHEMA business IS 'Business operations data: restoration jobs, clients, estimates, payments, financials';

-- Note: The public schema will continue to exist for Supabase system tables
-- and can be used for shared/utility tables if needed
