-- ============================================================================
-- Apex Business Schema Migration
-- Migrates SQLite apex_operations.db to Supabase
-- ============================================================================

-- Create the business schema
CREATE SCHEMA IF NOT EXISTS business;

-- ============================================================================
-- ORGANIZATIONS TABLE
-- Insurance carriers, TPAs, vendors, and internal entities
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.organizations (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    org_type TEXT NOT NULL CHECK (org_type IN ('insurance_carrier', 'tpa', 'vendor', 'internal')),
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    website TEXT,
    has_msa BOOLEAN DEFAULT FALSE,
    msa_signed_date DATE,
    msa_expiration_date DATE,
    trade_category TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_org_type ON business.organizations(org_type);
CREATE INDEX idx_organizations_name ON business.organizations(name);
CREATE INDEX idx_organizations_is_active ON business.organizations(is_active);

-- ============================================================================
-- CONTACTS TABLE
-- People associated with organizations (adjusters, vendors, etc.)
-- These are BUSINESS contacts, separate from personal contacts
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.contacts (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER REFERENCES business.organizations(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT,
    phone TEXT,
    phone_extension TEXT,
    email TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contacts_organization ON business.contacts(organization_id);
CREATE INDEX idx_contacts_name ON business.contacts(last_name, first_name);
CREATE INDEX idx_contacts_email ON business.contacts(email);
CREATE INDEX idx_contacts_is_active ON business.contacts(is_active);

-- ============================================================================
-- CLIENTS TABLE
-- Property owners / customers
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.clients (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    client_type TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_name ON business.clients(name);
CREATE INDEX idx_clients_email ON business.clients(email);
CREATE INDEX idx_clients_is_active ON business.clients(is_active);

-- ============================================================================
-- JOBS TABLE (formerly "projects" in SQLite)
-- Restoration jobs - the central entity for business operations
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.jobs (
    id SERIAL PRIMARY KEY,
    job_number TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'pending', 'inspection', 'active', 'complete', 'closed', 'cancelled')),

    -- Property info
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    year_built INTEGER,
    structure_type TEXT,
    square_footage INTEGER,
    num_stories INTEGER,

    -- Damage info
    damage_source TEXT,
    damage_category TEXT CHECK (damage_category IN ('1', '2', '3', NULL)),
    damage_class TEXT CHECK (damage_class IN ('1', '2', '3', '4', NULL)),

    -- Key dates
    date_of_loss DATE,
    date_contacted DATE,
    inspection_date DATE,
    work_auth_signed_date DATE,
    start_date DATE,
    cos_date DATE,
    completion_date DATE,

    -- Insurance info
    claim_number TEXT,
    policy_number TEXT,
    deductible DECIMAL(10, 2),

    -- Relations
    client_id INTEGER REFERENCES business.clients(id) ON DELETE SET NULL,
    insurance_org_id INTEGER REFERENCES business.organizations(id) ON DELETE SET NULL,

    -- Accounting flag
    ready_to_invoice BOOLEAN DEFAULT FALSE,

    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_job_number ON business.jobs(job_number);
CREATE INDEX idx_jobs_status ON business.jobs(status);
CREATE INDEX idx_jobs_client ON business.jobs(client_id);
CREATE INDEX idx_jobs_insurance_org ON business.jobs(insurance_org_id);
CREATE INDEX idx_jobs_date_of_loss ON business.jobs(date_of_loss);
CREATE INDEX idx_jobs_created_at ON business.jobs(created_at);

-- ============================================================================
-- JOB_CONTACTS TABLE
-- Links contacts to jobs (adjusters, project managers, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.job_contacts (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    contact_id INTEGER NOT NULL REFERENCES business.contacts(id) ON DELETE CASCADE,
    role_on_project TEXT,
    assigned_date DATE,
    is_primary_adjuster BOOLEAN DEFAULT FALSE,
    is_tpa BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(job_id, contact_id)
);

CREATE INDEX idx_job_contacts_job ON business.job_contacts(job_id);
CREATE INDEX idx_job_contacts_contact ON business.job_contacts(contact_id);

-- ============================================================================
-- JOB_NOTES TABLE (formerly "notes" in SQLite)
-- Job documentation and notes
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.job_notes (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    author_id INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    note_type TEXT,
    subject TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_job_notes_job ON business.job_notes(job_id);
CREATE INDEX idx_job_notes_created_at ON business.job_notes(created_at);

-- ============================================================================
-- MEDIA TABLE
-- Photos and documents attached to jobs
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.media (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    caption TEXT,
    uploaded_by INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_media_job ON business.media(job_id);
CREATE INDEX idx_media_file_type ON business.media(file_type);

-- ============================================================================
-- ESTIMATES TABLE
-- Estimate tracking with versions
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.estimates (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    estimate_type TEXT,
    amount DECIMAL(10, 2),
    original_amount DECIMAL(10, 2),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'revision_requested', 'revision', 'denied')),
    submitted_date DATE,
    approved_date DATE,
    xactimate_file_path TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_job ON business.estimates(job_id);
CREATE INDEX idx_estimates_status ON business.estimates(status);

-- ============================================================================
-- PAYMENTS TABLE
-- Payment tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.payments (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    estimate_id INTEGER REFERENCES business.estimates(id) ON DELETE SET NULL,
    invoice_number TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type TEXT,
    payment_method TEXT,
    check_number TEXT,
    received_date DATE,
    deposited_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_job ON business.payments(job_id);
CREATE INDEX idx_payments_estimate ON business.payments(estimate_id);
CREATE INDEX idx_payments_received_date ON business.payments(received_date);

-- ============================================================================
-- LABOR_ENTRIES TABLE
-- Per-employee hours tracking with hourly rate
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.labor_entries (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    hours DECIMAL(4, 2) NOT NULL,
    hourly_rate DECIMAL(8, 2),
    work_category TEXT,
    description TEXT,
    billable BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_labor_job ON business.labor_entries(job_id);
CREATE INDEX idx_labor_employee ON business.labor_entries(employee_id);
CREATE INDEX idx_labor_work_date ON business.labor_entries(work_date);

-- ============================================================================
-- RECEIPTS TABLE
-- Expense and receipt tracking for materials, rentals, subcontractors
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.receipts (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    vendor_id INTEGER REFERENCES business.organizations(id) ON DELETE SET NULL,
    expense_category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    receipt_file_path TEXT,
    reimbursable BOOLEAN DEFAULT FALSE,
    paid_by TEXT,
    created_by INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_receipts_job ON business.receipts(job_id);
CREATE INDEX idx_receipts_expense_date ON business.receipts(expense_date);
CREATE INDEX idx_receipts_vendor ON business.receipts(vendor_id);

-- ============================================================================
-- WORK_ORDERS TABLE
-- Scopes of work that may differ from or precede formal estimates
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.work_orders (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    work_order_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    budget_amount DECIMAL(10, 2),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'in_progress', 'completed', 'cancelled')),
    approved_by INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    approved_date DATE,
    document_file_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_work_orders_job ON business.work_orders(job_id);
CREATE INDEX idx_work_orders_status ON business.work_orders(status);

-- ============================================================================
-- ACTIVITY_LOG TABLE
-- Unified event log for Event Viewer feature
-- ============================================================================
CREATE TABLE IF NOT EXISTS business.activity_log (
    id SERIAL PRIMARY KEY,
    job_id INTEGER NOT NULL REFERENCES business.jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_subtype TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    description TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    amount DECIMAL(10, 2),
    actor_id INTEGER REFERENCES business.contacts(id) ON DELETE SET NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_job ON business.activity_log(job_id);
CREATE INDEX idx_activity_log_created_at ON business.activity_log(created_at);
CREATE INDEX idx_activity_log_event_type ON business.activity_log(event_type);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Jobs with client and carrier info
CREATE OR REPLACE VIEW business.v_jobs AS
SELECT
    j.id,
    j.job_number,
    j.status,
    c.name AS client_name,
    c.phone AS client_phone,
    c.email AS client_email,
    j.address,
    j.city,
    j.state,
    j.zip,
    o.name AS insurance_carrier,
    j.claim_number,
    j.damage_source,
    j.damage_category,
    j.start_date,
    j.notes,
    j.created_at
FROM business.jobs j
LEFT JOIN business.clients c ON j.client_id = c.id
LEFT JOIN business.organizations o ON j.insurance_org_id = o.id;

-- View: Contacts with organization info
CREATE OR REPLACE VIEW business.v_contacts AS
SELECT
    c.id,
    c.first_name,
    c.last_name,
    c.first_name || ' ' || c.last_name AS full_name,
    o.name AS organization,
    o.org_type,
    c.role,
    c.phone,
    c.email,
    c.is_active
FROM business.contacts c
LEFT JOIN business.organizations o ON c.organization_id = o.id;

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION business.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON business.organizations
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON business.contacts
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_clients_updated_at
    BEFORE UPDATE ON business.clients
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON business.jobs
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_estimates_updated_at
    BEFORE UPDATE ON business.estimates
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_labor_entries_updated_at
    BEFORE UPDATE ON business.labor_entries
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON business.receipts
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

CREATE TRIGGER update_work_orders_updated_at
    BEFORE UPDATE ON business.work_orders
    FOR EACH ROW EXECUTE FUNCTION business.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (Basic - Owner can see all)
-- ============================================================================
-- Note: For now, RLS is disabled. When multi-tenant is needed, enable these.
-- ALTER TABLE business.jobs ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "jobs_owner_all" ON business.jobs FOR ALL USING (true);
