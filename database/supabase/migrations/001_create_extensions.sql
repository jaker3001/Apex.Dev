-- =====================================================================
-- Migration 001: Enable PostgreSQL Extensions
-- =====================================================================
-- Purpose: Enable required PostgreSQL extensions for the application
-- Dependencies: None
-- Rollback: DROP EXTENSION IF EXISTS <extension_name> CASCADE;
-- =====================================================================

-- Enable UUID generation (required for auth and general use)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable cryptographic functions (required for password hashing, tokens)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable full-text search (required for notes, tasks, projects search)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Comment for tracking
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation for primary keys and tokens';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions for secure password hashing';
COMMENT ON EXTENSION "pg_trgm" IS 'Trigram similarity for full-text search';
