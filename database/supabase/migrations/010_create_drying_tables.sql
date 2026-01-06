-- =====================================================================
-- Migration 010: Create Drying Tracker Tables
-- =====================================================================
-- Purpose: Create tables for structural drying documentation
--          (moisture readings, equipment tracking, atmospheric data)
-- Dependencies: 005_create_business_tables.sql (for business schema)
-- Note: job_id references SQLite jobs table (no FK constraint until
--       jobs migrate to Supabase)
-- Rollback: DROP TABLE IF EXISTS business.drying_* CASCADE;
-- =====================================================================

SET search_path TO business, public;

-- =====================================================================
-- DRYING LOGS TABLE
-- Main entry point - one drying log per job (1:1 relationship)
-- =====================================================================

CREATE TABLE drying_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id INTEGER NOT NULL,  -- References SQLite jobs.id (app-level validation)

    -- Drying-specific job info
    start_date DATE NOT NULL,
    end_date DATE,
    dry_standard TEXT DEFAULT 'Goal',  -- e.g., "12%" or "Goal"
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'complete', 'on_hold')),

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(job_id)  -- One drying log per job
);

COMMENT ON TABLE drying_logs IS 'Structural drying documentation - one per restoration job';
COMMENT ON COLUMN drying_logs.job_id IS 'References SQLite jobs.id until jobs migrate to Supabase';
COMMENT ON COLUMN drying_logs.dry_standard IS 'Target moisture level (e.g., "12%" or "Goal")';

-- =====================================================================
-- DRYING CHAMBERS TABLE
-- Containment zones for drying (Containment, Open, Cavity)
-- =====================================================================

CREATE TABLE drying_chambers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drying_log_id UUID NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    chamber_type TEXT NOT NULL CHECK (chamber_type IN ('Containment', 'Open', 'Cavity')),
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drying_chambers IS 'Drying containment zones';
COMMENT ON COLUMN drying_chambers.chamber_type IS 'Containment=sealed, Open=uncontained, Cavity=wall/ceiling cavities';

-- =====================================================================
-- DRYING ROOMS TABLE
-- Affected areas within the property
-- =====================================================================

CREATE TABLE drying_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drying_log_id UUID NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,
    chamber_id UUID REFERENCES drying_chambers(id) ON DELETE SET NULL,

    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drying_rooms IS 'Affected areas being dried';

-- =====================================================================
-- DRYING REFERENCE POINTS TABLE
-- Moisture reading locations within rooms
-- =====================================================================

CREATE TABLE drying_reference_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,

    material TEXT NOT NULL,  -- e.g., "Drywall/Sheetrock", "Carpet", "Flooring"
    material_code TEXT NOT NULL,  -- e.g., "D", "C", "F", "SF", "FRM"
    baseline DECIMAL(6,2) NOT NULL DEFAULT 10,  -- Dry standard for this material
    saturation DECIMAL(6,2),  -- Initial wet reading (optional)
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drying_reference_points IS 'Specific moisture reading locations within rooms';
COMMENT ON COLUMN drying_reference_points.material_code IS 'D=Drywall, C=Carpet, F=Flooring, SF=Subfloor, FRM=Framing';
COMMENT ON COLUMN drying_reference_points.baseline IS 'Target dry reading for this material';
COMMENT ON COLUMN drying_reference_points.saturation IS 'Initial wet reading when drying started';

-- =====================================================================
-- DRYING MOISTURE READINGS TABLE
-- Daily moisture readings per reference point
-- =====================================================================

CREATE TABLE drying_moisture_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_point_id UUID NOT NULL REFERENCES drying_reference_points(id) ON DELETE CASCADE,

    reading_date DATE NOT NULL,
    reading_value DECIMAL(6,2),  -- Can be null if not taken that day

    UNIQUE(reference_point_id, reading_date)
);

COMMENT ON TABLE drying_moisture_readings IS 'Daily moisture readings per reference point';

-- =====================================================================
-- DRYING EQUIPMENT TABLE
-- Equipment types deployed in each room
-- =====================================================================

CREATE TABLE drying_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES drying_rooms(id) ON DELETE CASCADE,

    equipment_type TEXT NOT NULL,  -- "LGR Dehumidifier", "Air Mover", etc.

    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE drying_equipment IS 'Equipment types deployed per room';
COMMENT ON COLUMN drying_equipment.equipment_type IS 'LGR Dehumidifier, XL Dehumidifier, Air Mover, Air Scrubber, Heater';

-- =====================================================================
-- DRYING EQUIPMENT COUNTS TABLE
-- Daily equipment counts
-- =====================================================================

CREATE TABLE drying_equipment_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES drying_equipment(id) ON DELETE CASCADE,

    count_date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,

    UNIQUE(equipment_id, count_date)
);

COMMENT ON TABLE drying_equipment_counts IS 'Daily count of each equipment type in use';

-- =====================================================================
-- DRYING DAILY LOGS TABLE
-- Daily notes and status
-- =====================================================================

CREATE TABLE drying_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drying_log_id UUID NOT NULL REFERENCES drying_logs(id) ON DELETE CASCADE,

    log_date DATE NOT NULL,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(drying_log_id, log_date)
);

COMMENT ON TABLE drying_daily_logs IS 'Daily notes and observations';

-- =====================================================================
-- DRYING ATMOSPHERIC READINGS TABLE
-- Temperature, relative humidity, and GPP per location per day
-- =====================================================================

CREATE TABLE drying_atmospheric_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_log_id UUID NOT NULL REFERENCES drying_daily_logs(id) ON DELETE CASCADE,

    location TEXT NOT NULL,  -- "Outside", "Unaffected", or chamber name
    temp_f DECIMAL(5,2),  -- Temperature in Fahrenheit
    rh_percent DECIMAL(5,2),  -- Relative Humidity percentage
    gpp DECIMAL(6,2),  -- Grains Per Pound (calculated)

    UNIQUE(daily_log_id, location)
);

COMMENT ON TABLE drying_atmospheric_readings IS 'Atmospheric conditions at various locations';
COMMENT ON COLUMN drying_atmospheric_readings.gpp IS 'Grains Per Pound - moisture content indicator (<40 good, 40-60 moderate, >60 high)';

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX idx_drying_logs_job_id ON drying_logs(job_id);
CREATE INDEX idx_drying_logs_status ON drying_logs(status);
CREATE INDEX idx_drying_rooms_log_id ON drying_rooms(drying_log_id);
CREATE INDEX idx_drying_rooms_chamber_id ON drying_rooms(chamber_id);
CREATE INDEX idx_drying_reference_points_room_id ON drying_reference_points(room_id);
CREATE INDEX idx_drying_moisture_readings_date ON drying_moisture_readings(reading_date);
CREATE INDEX idx_drying_moisture_readings_ref_point ON drying_moisture_readings(reference_point_id);
CREATE INDEX idx_drying_equipment_room_id ON drying_equipment(room_id);
CREATE INDEX idx_drying_equipment_counts_date ON drying_equipment_counts(count_date);
CREATE INDEX idx_drying_daily_logs_log_id ON drying_daily_logs(drying_log_id);
CREATE INDEX idx_drying_daily_logs_date ON drying_daily_logs(log_date);
CREATE INDEX idx_drying_atmospheric_daily_log ON drying_atmospheric_readings(daily_log_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE drying_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_chambers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_reference_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_moisture_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_equipment_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE drying_atmospheric_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users full access (single-tenant for now)
-- Can be refined later for multi-tenant with user_id checks

CREATE POLICY "Allow authenticated users full access to drying_logs"
    ON drying_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_chambers"
    ON drying_chambers FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_rooms"
    ON drying_rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_reference_points"
    ON drying_reference_points FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_moisture_readings"
    ON drying_moisture_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_equipment"
    ON drying_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_equipment_counts"
    ON drying_equipment_counts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_daily_logs"
    ON drying_daily_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to drying_atmospheric_readings"
    ON drying_atmospheric_readings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================================

CREATE OR REPLACE FUNCTION update_drying_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_drying_logs_updated_at
    BEFORE UPDATE ON drying_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_drying_log_updated_at();
