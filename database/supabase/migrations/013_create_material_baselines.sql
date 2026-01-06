-- Migration: 013_create_material_baselines.sql
-- Purpose: Store custom baseline preferences per material type

-- Create table for storing custom material baselines
CREATE TABLE IF NOT EXISTS business.material_baselines (
  material_code TEXT PRIMARY KEY,
  baseline DECIMAL(6,2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment on table purpose
COMMENT ON TABLE business.material_baselines IS 'Stores custom baseline moisture percentages per material type for drying reference points';

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION business.update_material_baseline_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_baselines_updated_at
  BEFORE UPDATE ON business.material_baselines
  FOR EACH ROW
  EXECUTE FUNCTION business.update_material_baseline_timestamp();
