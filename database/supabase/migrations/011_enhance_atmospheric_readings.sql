-- =====================================================================
-- Migration 011: Enhance Atmospheric Readings
-- =====================================================================
-- Purpose: Add location_type enum, chamber_id, and equipment_id columns
--          to support per-dehumidifier exhaust readings
-- Dependencies: 010_create_drying_tables.sql
-- Rollback: See bottom of file
-- =====================================================================

SET search_path TO business, public;

-- =====================================================================
-- CREATE ENUM TYPE FOR LOCATION TYPES
-- =====================================================================

CREATE TYPE atmospheric_location_type AS ENUM (
    'outside',              -- Weather/exterior conditions
    'unaffected',           -- Inside property, not in drying zone
    'chamber_interior',     -- Inside a drying chamber (affected area)
    'dehumidifier_exhaust'  -- Exhaust from specific dehumidifier
);

COMMENT ON TYPE atmospheric_location_type IS 'Types of atmospheric reading locations';

-- =====================================================================
-- ADD NEW COLUMNS TO ATMOSPHERIC READINGS
-- =====================================================================

-- Add location_type column (nullable initially for migration)
ALTER TABLE drying_atmospheric_readings
ADD COLUMN location_type atmospheric_location_type;

-- Add chamber_id reference (for chamber_interior and dehumidifier_exhaust)
ALTER TABLE drying_atmospheric_readings
ADD COLUMN chamber_id UUID REFERENCES drying_chambers(id) ON DELETE CASCADE;

-- Add equipment_id reference (for dehumidifier_exhaust only)
ALTER TABLE drying_atmospheric_readings
ADD COLUMN equipment_id UUID REFERENCES drying_equipment(id) ON DELETE CASCADE;

-- =====================================================================
-- MIGRATE EXISTING DATA
-- =====================================================================

-- Convert existing 'location' string values to location_type enum
UPDATE drying_atmospheric_readings
SET location_type = CASE
    WHEN location = 'Outside' THEN 'outside'::atmospheric_location_type
    WHEN location = 'Unaffected' THEN 'unaffected'::atmospheric_location_type
    ELSE 'chamber_interior'::atmospheric_location_type
END;

-- For non-Outside/Unaffected readings, try to link to chamber by name
UPDATE drying_atmospheric_readings ar
SET chamber_id = c.id
FROM drying_daily_logs dl
JOIN drying_chambers c ON c.drying_log_id = dl.drying_log_id
WHERE ar.daily_log_id = dl.id
  AND ar.location_type = 'chamber_interior'
  AND ar.location = c.name;

-- =====================================================================
-- MAKE LOCATION_TYPE NOT NULL
-- =====================================================================

ALTER TABLE drying_atmospheric_readings
ALTER COLUMN location_type SET NOT NULL;

-- =====================================================================
-- UPDATE UNIQUE CONSTRAINT
-- =====================================================================

-- Drop old unique constraint (location string based)
ALTER TABLE drying_atmospheric_readings
DROP CONSTRAINT IF EXISTS drying_atmospheric_readings_daily_log_id_location_key;

-- Create new unique constraint that allows multiple exhaust readings
-- - For outside/unaffected: one per daily_log_id
-- - For chamber_interior: one per chamber per daily_log_id
-- - For dehumidifier_exhaust: one per equipment per daily_log_id
ALTER TABLE drying_atmospheric_readings
ADD CONSTRAINT drying_atmospheric_readings_unique
UNIQUE NULLS NOT DISTINCT (daily_log_id, location_type, chamber_id, equipment_id);

-- =====================================================================
-- ADD INDEXES FOR NEW COLUMNS
-- =====================================================================

CREATE INDEX idx_drying_atmospheric_location_type
    ON drying_atmospheric_readings(location_type);

CREATE INDEX idx_drying_atmospheric_chamber_id
    ON drying_atmospheric_readings(chamber_id);

CREATE INDEX idx_drying_atmospheric_equipment_id
    ON drying_atmospheric_readings(equipment_id);

-- =====================================================================
-- ADD CONSTRAINT TO VALIDATE LOCATION_TYPE REQUIREMENTS
-- =====================================================================

-- Ensure chamber_id is set for chamber_interior and dehumidifier_exhaust
ALTER TABLE drying_atmospheric_readings
ADD CONSTRAINT check_chamber_required
CHECK (
    (location_type IN ('outside', 'unaffected') AND chamber_id IS NULL)
    OR
    (location_type IN ('chamber_interior', 'dehumidifier_exhaust') AND chamber_id IS NOT NULL)
);

-- Ensure equipment_id is only set for dehumidifier_exhaust
ALTER TABLE drying_atmospheric_readings
ADD CONSTRAINT check_equipment_required
CHECK (
    (location_type != 'dehumidifier_exhaust' AND equipment_id IS NULL)
    OR
    (location_type = 'dehumidifier_exhaust' AND equipment_id IS NOT NULL)
);

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON COLUMN drying_atmospheric_readings.location_type IS 'Type of reading location (outside, unaffected, chamber_interior, dehumidifier_exhaust)';
COMMENT ON COLUMN drying_atmospheric_readings.chamber_id IS 'Reference to drying chamber (required for chamber_interior and dehumidifier_exhaust)';
COMMENT ON COLUMN drying_atmospheric_readings.equipment_id IS 'Reference to specific dehumidifier (required for dehumidifier_exhaust only)';

-- =====================================================================
-- ROLLBACK (if needed):
-- =====================================================================
-- ALTER TABLE drying_atmospheric_readings DROP CONSTRAINT IF EXISTS check_equipment_required;
-- ALTER TABLE drying_atmospheric_readings DROP CONSTRAINT IF EXISTS check_chamber_required;
-- ALTER TABLE drying_atmospheric_readings DROP CONSTRAINT IF EXISTS drying_atmospheric_readings_unique;
-- DROP INDEX IF EXISTS idx_drying_atmospheric_equipment_id;
-- DROP INDEX IF EXISTS idx_drying_atmospheric_chamber_id;
-- DROP INDEX IF EXISTS idx_drying_atmospheric_location_type;
-- ALTER TABLE drying_atmospheric_readings DROP COLUMN IF EXISTS equipment_id;
-- ALTER TABLE drying_atmospheric_readings DROP COLUMN IF EXISTS chamber_id;
-- ALTER TABLE drying_atmospheric_readings DROP COLUMN IF EXISTS location_type;
-- DROP TYPE IF EXISTS atmospheric_location_type;
-- ALTER TABLE drying_atmospheric_readings ADD CONSTRAINT drying_atmospheric_readings_daily_log_id_location_key UNIQUE (daily_log_id, location);
