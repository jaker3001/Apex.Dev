-- Migration: Remove Global Dry Standard Field
--
-- The dry_standard field was a global text field ("Goal", "12%", etc.) on drying_logs.
-- This is redundant because per-material dry standards are tracked via the 'baseline'
-- field on drying_reference_points, which is numeric and per-material.
--
-- Different building materials have different acceptable moisture levels,
-- so a single global standard doesn't make sense.

ALTER TABLE business.drying_logs DROP COLUMN IF EXISTS dry_standard;
