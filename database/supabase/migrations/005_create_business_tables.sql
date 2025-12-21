-- =====================================================================
-- Migration 005: Create Business Schema Tables
-- =====================================================================
-- Purpose: Create all restoration business tables (jobs, clients,
--          estimates, payments, etc.)
-- Dependencies: 004_create_dashboard_tables.sql
-- Rollback: DROP TABLE IF EXISTS business.<table_name> CASCADE;
-- =====================================================================

SET search_path TO business, public;

-- =====================================================================
-- ORGANIZATIONS TABLE
-- Insurance carriers, TPAs, vendors, and internal entities
-- =====================================================================

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    org_type org_type NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    website TEXT,
    has_msa BOOLEAN DEFAULT FALSE,
    msa_signed_date DATE,
    msa_expiration_date DATE,
    trade_category TEXT,  -- For vendors: plumbing, electrical, etc.
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE organizations IS 'Insurance carriers, TPAs, vendors, and internal entities';

-- =====================================================================
-- CONTACTS TABLE
-- People associated with organizations (adjusters, vendors, etc.)
-- =====================================================================

CREATE TABLE contacts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    phone_extension TEXT,
    email TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE contacts IS 'People at organizations (adjusters, vendor contacts, etc.)';

-- =====================================================================
-- CLIENTS TABLE
-- Property owners / customers
-- =====================================================================

CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    phone_alt TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE clients IS 'Property owners and customers';

-- =====================================================================
-- JOBS TABLE (Projects in apex_operations.db)
-- Restoration jobs - the central business entity
-- =====================================================================

CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    job_number TEXT UNIQUE NOT NULL,
    status job_status DEFAULT 'lead',

    -- Property info
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    year_built INTEGER,
    structure_type TEXT,  -- 'single_family', 'multi_family', 'commercial', etc.
    square_footage INTEGER,
    num_stories INTEGER,

    -- Damage info
    damage_source TEXT,  -- 'water', 'fire', 'mold', 'storm', etc.
    damage_category TEXT,  -- 'cat1', 'cat2', 'cat3' for water
    damage_class TEXT,  -- 'class1', 'class2', 'class3', 'class4' for water

    -- Dates
    date_of_loss DATE,
    date_contacted DATE,
    inspection_date DATE,
    work_auth_signed_date DATE,
    start_date DATE,
    cos_date DATE,  -- Certificate of Satisfaction
    completion_date DATE,

    -- Insurance info
    claim_number TEXT,
    policy_number TEXT,
    deductible DECIMAL(10,2),

    -- Relations
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    insurance_org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,

    -- Notes
    notes TEXT,
    ready_to_invoice BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE jobs IS 'Restoration jobs (projects) - main business entity';
COMMENT ON COLUMN jobs.damage_category IS 'Water damage categories: cat1 (clean), cat2 (gray), cat3 (black)';
COMMENT ON COLUMN jobs.damage_class IS 'Water damage classes: class1-4 indicating evaporation rate';

-- =====================================================================
-- PROJECT_CONTACTS (Junction for job contacts)
-- Links contacts to jobs with roles
-- =====================================================================

CREATE TABLE project_contacts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    role TEXT,  -- 'adjuster', 'desk_adjuster', 'superintendent', etc.
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, contact_id, role)
);

COMMENT ON TABLE project_contacts IS 'Links contacts to jobs with specific roles';

-- =====================================================================
-- ESTIMATES TABLE
-- Xactimate estimates with versions
-- =====================================================================

CREATE TABLE estimates (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,  -- 1 for initial, 2+ for supplements
    estimate_type estimate_type NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    original_amount DECIMAL(10,2),  -- Before any adjustments
    status estimate_status DEFAULT 'draft',
    submitted_date DATE,
    approved_date DATE,
    xactimate_file_path TEXT,  -- Path to ESX or PDF file
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, version)
);

COMMENT ON TABLE estimates IS 'Xactimate estimates with versioning for supplements';

-- =====================================================================
-- PAYMENTS TABLE
-- Received payments from insurance
-- =====================================================================

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    estimate_id INTEGER REFERENCES estimates(id) ON DELETE SET NULL,
    invoice_number TEXT,
    amount DECIMAL(10,2) NOT NULL,
    payment_type payment_type NOT NULL,
    payment_method payment_method,
    check_number TEXT,
    received_date DATE NOT NULL,
    deposited_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE payments IS 'Payments received from insurance companies';

-- =====================================================================
-- NOTES TABLE (Job-specific notes)
-- Separate from dashboard.notes (personal PKM)
-- =====================================================================

CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID,  -- Cross-schema reference to dashboard.users
    note_type job_note_type DEFAULT 'general',
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notes IS 'Job-specific notes, separate from dashboard personal notes';
COMMENT ON COLUMN notes.user_id IS 'Cross-schema reference to dashboard.users';

-- =====================================================================
-- MEDIA TABLE
-- Photos, documents attached to jobs
-- =====================================================================

CREATE TABLE media (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,  -- 'image', 'document', 'video'
    mime_type TEXT,
    file_size INTEGER,  -- Bytes
    description TEXT,
    uploaded_by UUID,  -- Cross-schema reference to dashboard.users
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE media IS 'Photos and documents attached to jobs';

-- =====================================================================
-- RECEIPTS TABLE
-- Expense receipts for job costs
-- =====================================================================

CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    vendor TEXT,
    amount DECIMAL(10,2) NOT NULL,
    category TEXT,  -- 'equipment', 'materials', 'labor', 'subcontractor', etc.
    description TEXT,
    receipt_date DATE NOT NULL,
    payment_method payment_method,
    receipt_image_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE receipts IS 'Expense receipts for job costs';

-- =====================================================================
-- WORK_ORDERS TABLE
-- Subcontractor work orders
-- =====================================================================

CREATE TABLE work_orders (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    vendor_org_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2),
    status work_order_status DEFAULT 'pending',
    issued_date DATE,
    completed_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE work_orders IS 'Subcontractor work orders';

-- =====================================================================
-- LABOR_ENTRIES TABLE
-- Employee time tracking per job
-- =====================================================================

CREATE TABLE labor_entries (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID,  -- Cross-schema reference to dashboard.users
    hours DECIMAL(5,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(8,2),  -- Optional, for costing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE labor_entries IS 'Employee time tracking per job';
COMMENT ON COLUMN labor_entries.user_id IS 'Cross-schema reference to dashboard.users';

-- =====================================================================
-- ACTIVITY_LOG TABLE
-- Job event history
-- =====================================================================

CREATE TABLE activity_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID,  -- Cross-schema reference to dashboard.users
    action activity_action NOT NULL,
    description TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE activity_log IS 'Audit log of all job events and changes';
COMMENT ON COLUMN activity_log.user_id IS 'Cross-schema reference to dashboard.users';
