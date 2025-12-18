"""
Apex Assistant - Operations Schemas

Pydantic models for project management operations including:
- Organizations (carriers, TPAs, vendors)
- Contacts (adjusters, vendors, employees)
- Clients (property owners)
- Projects (restoration jobs)
- Notes, Estimates, Payments
"""

from typing import Optional, List, Literal
from pydantic import BaseModel
from datetime import datetime


# =============================================================================
# ORGANIZATION SCHEMAS
# =============================================================================

class OrganizationCreate(BaseModel):
    """Schema for creating a new organization."""
    name: str
    org_type: Literal["insurance_carrier", "tpa", "vendor", "internal"]
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    has_msa: bool = False
    msa_signed_date: Optional[str] = None
    msa_expiration_date: Optional[str] = None
    trade_category: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization (all fields optional)."""
    name: Optional[str] = None
    org_type: Optional[Literal["insurance_carrier", "tpa", "vendor", "internal"]] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    has_msa: Optional[bool] = None
    msa_signed_date: Optional[str] = None
    msa_expiration_date: Optional[str] = None
    trade_category: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationResponse(BaseModel):
    """Response schema for an organization."""
    id: int
    name: str
    org_type: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    has_msa: bool = False
    msa_signed_date: Optional[str] = None
    msa_expiration_date: Optional[str] = None
    trade_category: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None


class OrganizationListResponse(BaseModel):
    """Response schema for listing organizations."""
    organizations: List[OrganizationResponse]
    total: int


# =============================================================================
# CONTACT SCHEMAS
# =============================================================================

class ContactCreate(BaseModel):
    """Schema for creating a new contact."""
    organization_id: Optional[int] = None
    first_name: str
    last_name: str
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class ContactUpdate(BaseModel):
    """Schema for updating a contact (all fields optional)."""
    organization_id: Optional[int] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ContactResponse(BaseModel):
    """Response schema for a contact."""
    id: int
    organization_id: Optional[int] = None
    first_name: str
    last_name: str
    full_name: Optional[str] = None  # Computed field
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None
    # When included from view
    organization: Optional[str] = None
    org_type: Optional[str] = None


class ContactListResponse(BaseModel):
    """Response schema for listing contacts."""
    contacts: List[ContactResponse]
    total: int


# =============================================================================
# CLIENT SCHEMAS
# =============================================================================

class ClientCreate(BaseModel):
    """Schema for creating a new client."""
    name: str
    client_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True


class ClientUpdate(BaseModel):
    """Schema for updating a client (all fields optional)."""
    name: Optional[str] = None
    client_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class ClientResponse(BaseModel):
    """Response schema for a client."""
    id: int
    name: str
    client_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: Optional[str] = None


class ClientListResponse(BaseModel):
    """Response schema for listing clients."""
    clients: List[ClientResponse]
    total: int


# =============================================================================
# PROJECT SCHEMAS
# =============================================================================

ProjectStatus = Literal["lead", "pending", "active", "complete", "closed", "cancelled"]


class ProjectCreate(BaseModel):
    """Schema for creating a new project."""
    job_number: str
    status: ProjectStatus = "lead"
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    year_built: Optional[int] = None
    structure_type: Optional[str] = None
    square_footage: Optional[int] = None
    num_stories: Optional[int] = None
    damage_source: Optional[str] = None
    damage_category: Optional[str] = None
    damage_class: Optional[str] = None
    date_of_loss: Optional[str] = None
    date_contacted: Optional[str] = None
    inspection_date: Optional[str] = None
    work_auth_signed_date: Optional[str] = None
    start_date: Optional[str] = None
    cos_date: Optional[str] = None
    completion_date: Optional[str] = None
    claim_number: Optional[str] = None
    policy_number: Optional[str] = None
    deductible: Optional[float] = None
    client_id: Optional[int] = None
    insurance_org_id: Optional[int] = None
    notes: Optional[str] = None
    # Client info - if provided without client_id, auto-create client
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None


class ProjectUpdate(BaseModel):
    """Schema for updating a project (all fields optional)."""
    job_number: Optional[str] = None
    status: Optional[ProjectStatus] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    year_built: Optional[int] = None
    structure_type: Optional[str] = None
    square_footage: Optional[int] = None
    num_stories: Optional[int] = None
    damage_source: Optional[str] = None
    damage_category: Optional[str] = None
    damage_class: Optional[str] = None
    date_of_loss: Optional[str] = None
    date_contacted: Optional[str] = None
    inspection_date: Optional[str] = None
    work_auth_signed_date: Optional[str] = None
    start_date: Optional[str] = None
    cos_date: Optional[str] = None
    completion_date: Optional[str] = None
    claim_number: Optional[str] = None
    policy_number: Optional[str] = None
    deductible: Optional[float] = None
    client_id: Optional[int] = None
    insurance_org_id: Optional[int] = None
    notes: Optional[str] = None


class ProjectResponse(BaseModel):
    """Response schema for a project (basic info)."""
    id: int
    job_number: str
    status: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    year_built: Optional[int] = None
    structure_type: Optional[str] = None
    square_footage: Optional[int] = None
    num_stories: Optional[int] = None
    damage_source: Optional[str] = None
    damage_category: Optional[str] = None
    damage_class: Optional[str] = None
    date_of_loss: Optional[str] = None
    date_contacted: Optional[str] = None
    inspection_date: Optional[str] = None
    work_auth_signed_date: Optional[str] = None
    start_date: Optional[str] = None
    cos_date: Optional[str] = None
    completion_date: Optional[str] = None
    claim_number: Optional[str] = None
    policy_number: Optional[str] = None
    deductible: Optional[float] = None
    client_id: Optional[int] = None
    insurance_org_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # From v_projects view
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    insurance_carrier: Optional[str] = None


class ProjectListResponse(BaseModel):
    """Response schema for listing projects."""
    projects: List[ProjectResponse]
    total: int


class ProjectStatsResponse(BaseModel):
    """Response schema for project statistics."""
    total: int
    by_status: dict
    active: int
    lead: int
    complete: int


# =============================================================================
# NOTE SCHEMAS
# =============================================================================

class NoteCreate(BaseModel):
    """Schema for creating a new note."""
    project_id: int
    author_id: Optional[int] = None
    note_type: Optional[str] = None
    subject: Optional[str] = None
    content: str


class NoteUpdate(BaseModel):
    """Schema for updating a note (all fields optional)."""
    author_id: Optional[int] = None
    note_type: Optional[str] = None
    subject: Optional[str] = None
    content: Optional[str] = None


class NoteResponse(BaseModel):
    """Response schema for a note."""
    id: int
    project_id: int
    author_id: Optional[int] = None
    note_type: Optional[str] = None
    subject: Optional[str] = None
    content: str
    created_at: Optional[str] = None
    # Computed/joined fields
    author_name: Optional[str] = None


class NoteListResponse(BaseModel):
    """Response schema for listing notes."""
    notes: List[NoteResponse]
    total: int


# =============================================================================
# ESTIMATE SCHEMAS
# =============================================================================

EstimateStatus = Literal["draft", "submitted", "approved", "revision_requested", "revision", "denied"]


class EstimateCreate(BaseModel):
    """Schema for creating a new estimate."""
    project_id: Optional[int] = None  # Optional because it comes from URL path
    version: int = 1
    estimate_type: Optional[str] = None
    amount: Optional[float] = None
    original_amount: Optional[float] = None  # Tracks the initial submission amount
    status: EstimateStatus = "draft"
    submitted_date: Optional[str] = None
    approved_date: Optional[str] = None
    xactimate_file_path: Optional[str] = None
    notes: Optional[str] = None


class EstimateUpdate(BaseModel):
    """Schema for updating an estimate (all fields optional)."""
    version: Optional[int] = None
    estimate_type: Optional[str] = None
    amount: Optional[float] = None
    original_amount: Optional[float] = None
    status: Optional[EstimateStatus] = None
    submitted_date: Optional[str] = None
    approved_date: Optional[str] = None
    xactimate_file_path: Optional[str] = None
    notes: Optional[str] = None


class EstimateResponse(BaseModel):
    """Response schema for an estimate."""
    id: int
    project_id: int
    version: int = 1
    estimate_type: Optional[str] = None
    amount: Optional[float] = None
    original_amount: Optional[float] = None  # The initial submission amount for reduction tracking
    status: str = "draft"
    submitted_date: Optional[str] = None
    approved_date: Optional[str] = None
    xactimate_file_path: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class EstimateListResponse(BaseModel):
    """Response schema for listing estimates."""
    estimates: List[EstimateResponse]
    total: int


# =============================================================================
# PAYMENT SCHEMAS
# =============================================================================

class PaymentCreate(BaseModel):
    """Schema for creating a new payment."""
    project_id: int
    estimate_id: Optional[int] = None
    invoice_number: Optional[str] = None
    amount: float
    payment_type: Optional[str] = None
    payment_method: Optional[str] = None
    check_number: Optional[str] = None
    received_date: Optional[str] = None
    deposited_date: Optional[str] = None
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    """Schema for updating a payment (all fields optional)."""
    estimate_id: Optional[int] = None
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    payment_type: Optional[str] = None
    payment_method: Optional[str] = None
    check_number: Optional[str] = None
    received_date: Optional[str] = None
    deposited_date: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    """Response schema for a payment."""
    id: int
    project_id: int
    estimate_id: Optional[int] = None
    invoice_number: Optional[str] = None
    amount: float
    payment_type: Optional[str] = None
    payment_method: Optional[str] = None
    check_number: Optional[str] = None
    received_date: Optional[str] = None
    deposited_date: Optional[str] = None
    notes: Optional[str] = None
    created_at: Optional[str] = None


class PaymentListResponse(BaseModel):
    """Response schema for listing payments."""
    payments: List[PaymentResponse]
    total: int


# =============================================================================
# MEDIA SCHEMAS
# =============================================================================

class MediaCreate(BaseModel):
    """Schema for creating a new media record."""
    project_id: int
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    caption: Optional[str] = None
    uploaded_by: Optional[int] = None


class MediaUpdate(BaseModel):
    """Schema for updating a media record (all fields optional)."""
    file_name: Optional[str] = None
    file_path: Optional[str] = None
    file_type: Optional[str] = None
    caption: Optional[str] = None


class MediaResponse(BaseModel):
    """Response schema for a media record."""
    id: int
    project_id: int
    file_name: str
    file_path: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    caption: Optional[str] = None
    uploaded_by: Optional[int] = None
    uploaded_at: Optional[str] = None
    # Computed/joined fields
    uploaded_by_name: Optional[str] = None


class MediaListResponse(BaseModel):
    """Response schema for listing media."""
    media: List[MediaResponse]
    total: int


# =============================================================================
# PROJECT CONTACT (LINK TABLE) SCHEMAS
# =============================================================================

class ProjectContactCreate(BaseModel):
    """Schema for assigning a contact to a project."""
    contact_id: int
    role_on_project: Optional[str] = None
    assigned_date: Optional[str] = None
    notes: Optional[str] = None
    is_primary_adjuster: Optional[bool] = False
    is_tpa: Optional[bool] = False


class ProjectContactResponse(BaseModel):
    """Response schema for a project contact assignment."""
    id: int
    organization_id: Optional[int] = None
    first_name: str
    last_name: str
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    # From join with organizations
    organization_name: Optional[str] = None
    org_type: Optional[str] = None
    # MSA fields from organization
    has_msa: Optional[bool] = None
    msa_signed_date: Optional[str] = None
    msa_expiration_date: Optional[str] = None
    # Project contact assignment fields
    role_on_project: Optional[str] = None
    assignment_id: Optional[int] = None
    is_primary_adjuster: Optional[bool] = None
    is_tpa: Optional[bool] = None

    class Config:
        extra = "allow"


class ProjectContactListResponse(BaseModel):
    """Response schema for listing project contacts."""
    contacts: List[ProjectContactResponse]
    total: int


# =============================================================================
# PROJECT FULL RESPONSE (INCLUDES ALL RELATED DATA)
# =============================================================================

class ProjectContactDetail(BaseModel):
    """Contact details as returned in project full response."""
    id: int
    organization_id: Optional[int] = None
    first_name: str
    last_name: str
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None
    organization_name: Optional[str] = None
    org_type: Optional[str] = None
    # MSA fields from organization
    has_msa: Optional[bool] = None
    msa_signed_date: Optional[str] = None
    msa_expiration_date: Optional[str] = None
    # Project contact assignment fields
    role_on_project: Optional[str] = None
    is_primary_adjuster: Optional[bool] = None
    is_tpa: Optional[bool] = None

    class Config:
        extra = "allow"


class ProjectFullResponse(BaseModel):
    """
    Complete project response including all related data.
    Used for the project detail page.

    Project fields are at the root level, with nested client, carrier,
    contacts, notes, estimates, and payments.
    """
    # Project fields (at root)
    id: int
    job_number: str
    status: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    year_built: Optional[int] = None
    structure_type: Optional[str] = None
    square_footage: Optional[int] = None
    num_stories: Optional[int] = None
    damage_source: Optional[str] = None
    damage_category: Optional[str] = None
    damage_class: Optional[str] = None
    date_of_loss: Optional[str] = None
    date_contacted: Optional[str] = None
    inspection_date: Optional[str] = None
    work_auth_signed_date: Optional[str] = None
    start_date: Optional[str] = None
    cos_date: Optional[str] = None
    completion_date: Optional[str] = None
    claim_number: Optional[str] = None
    policy_number: Optional[str] = None
    deductible: Optional[float] = None
    ready_to_invoice: Optional[bool] = False
    notes: Optional[List[NoteResponse]] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # From v_projects view
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    client_email: Optional[str] = None
    insurance_carrier: Optional[str] = None
    # Related data
    client: Optional[ClientResponse] = None
    carrier: Optional[OrganizationResponse] = None
    contacts: List[ProjectContactDetail] = []
    estimates: List[EstimateResponse] = []
    payments: List[PaymentResponse] = []
    media: List[MediaResponse] = []
    # New accounting-related data
    labor_entries: List["LaborEntryResponse"] = []
    receipts: List["ReceiptResponse"] = []
    work_orders: List["WorkOrderResponse"] = []
    accounting_summary: Optional["AccountingSummaryResponse"] = None

    class Config:
        extra = "allow"


# =============================================================================
# LABOR ENTRY SCHEMAS
# =============================================================================

WorkCategory = Literal[
    "demo", "drying", "cleanup", "monitoring", "repair", "admin", "travel", "other"
]


class LaborEntryCreate(BaseModel):
    """Schema for creating a new labor entry."""
    employee_id: Optional[int] = None
    work_date: str  # YYYY-MM-DD
    hours: float
    hourly_rate: Optional[float] = None
    work_category: Optional[str] = None
    description: Optional[str] = None
    billable: bool = True
    created_by: Optional[int] = None


class LaborEntryUpdate(BaseModel):
    """Schema for updating a labor entry (all fields optional)."""
    employee_id: Optional[int] = None
    work_date: Optional[str] = None
    hours: Optional[float] = None
    hourly_rate: Optional[float] = None
    work_category: Optional[str] = None
    description: Optional[str] = None
    billable: Optional[bool] = None


class LaborEntryResponse(BaseModel):
    """Response schema for a labor entry."""
    id: int
    project_id: int
    employee_id: Optional[int] = None
    work_date: str
    hours: float
    hourly_rate: Optional[float] = None
    work_category: Optional[str] = None
    description: Optional[str] = None
    billable: bool = True
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Computed/joined fields
    employee_name: Optional[str] = None
    total_cost: Optional[float] = None


class LaborEntryListResponse(BaseModel):
    """Response schema for listing labor entries."""
    labor_entries: List[LaborEntryResponse]
    total: int


# =============================================================================
# RECEIPT SCHEMAS
# =============================================================================

ExpenseCategory = Literal[
    "materials", "equipment_rental", "subcontractor", "disposal", "permit", "supplies", "other"
]

PaidBy = Literal[
    "company_card", "cash", "personal_reimbursement", "vendor_invoice"
]


class ReceiptCreate(BaseModel):
    """Schema for creating a new receipt."""
    vendor_id: Optional[int] = None
    expense_category: str
    description: str
    amount: float
    expense_date: str  # YYYY-MM-DD
    receipt_file_path: Optional[str] = None
    reimbursable: bool = False
    paid_by: Optional[str] = None
    created_by: Optional[int] = None


class ReceiptUpdate(BaseModel):
    """Schema for updating a receipt (all fields optional)."""
    vendor_id: Optional[int] = None
    expense_category: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    expense_date: Optional[str] = None
    receipt_file_path: Optional[str] = None
    reimbursable: Optional[bool] = None
    paid_by: Optional[str] = None


class ReceiptResponse(BaseModel):
    """Response schema for a receipt."""
    id: int
    project_id: int
    vendor_id: Optional[int] = None
    expense_category: str
    description: str
    amount: float
    expense_date: str
    receipt_file_path: Optional[str] = None
    reimbursable: bool = False
    paid_by: Optional[str] = None
    created_by: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Computed/joined fields
    vendor_name: Optional[str] = None


class ReceiptListResponse(BaseModel):
    """Response schema for listing receipts."""
    receipts: List[ReceiptResponse]
    total: int


# =============================================================================
# WORK ORDER SCHEMAS
# =============================================================================

WorkOrderStatus = Literal["draft", "approved", "in_progress", "completed", "cancelled"]


class WorkOrderCreate(BaseModel):
    """Schema for creating a new work order."""
    work_order_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    budget_amount: Optional[float] = None
    status: WorkOrderStatus = "draft"
    approved_by: Optional[int] = None
    approved_date: Optional[str] = None
    document_file_path: Optional[str] = None


class WorkOrderUpdate(BaseModel):
    """Schema for updating a work order (all fields optional)."""
    work_order_number: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    budget_amount: Optional[float] = None
    status: Optional[WorkOrderStatus] = None
    approved_by: Optional[int] = None
    approved_date: Optional[str] = None
    document_file_path: Optional[str] = None


class WorkOrderResponse(BaseModel):
    """Response schema for a work order."""
    id: int
    project_id: int
    work_order_number: Optional[str] = None
    title: str
    description: Optional[str] = None
    budget_amount: Optional[float] = None
    status: str = "draft"
    approved_by: Optional[int] = None
    approved_date: Optional[str] = None
    document_file_path: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    # Computed/joined fields
    approved_by_name: Optional[str] = None


class WorkOrderListResponse(BaseModel):
    """Response schema for listing work orders."""
    work_orders: List[WorkOrderResponse]
    total: int


# =============================================================================
# ACTIVITY LOG SCHEMAS
# =============================================================================

EventType = Literal[
    "note_added", "note_updated", "note_deleted",
    "estimate_created", "estimate_updated", "estimate_status_changed",
    "payment_received", "payment_updated",
    "media_uploaded", "media_deleted",
    "labor_logged", "labor_updated", "labor_deleted",
    "receipt_added", "receipt_updated", "receipt_deleted",
    "work_order_created", "work_order_updated", "work_order_status_changed",
    "status_changed", "project_created", "project_updated",
    "contact_assigned", "contact_removed"
]


class ActivityLogCreate(BaseModel):
    """Schema for creating a new activity log entry."""
    event_type: str
    event_subtype: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    amount: Optional[float] = None
    actor_id: Optional[int] = None
    metadata: Optional[str] = None  # JSON string


class ActivityLogResponse(BaseModel):
    """Response schema for an activity log entry."""
    id: int
    project_id: int
    event_type: str
    event_subtype: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    description: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    amount: Optional[float] = None
    actor_id: Optional[int] = None
    metadata: Optional[str] = None
    created_at: Optional[str] = None
    # Computed/joined fields
    actor_name: Optional[str] = None


class ActivityLogListResponse(BaseModel):
    """Response schema for listing activity log entries."""
    activities: List[ActivityLogResponse]
    total: int


# =============================================================================
# ACCOUNTING SUMMARY SCHEMAS
# =============================================================================

class AccountingSummaryResponse(BaseModel):
    """
    Response schema for accounting summary.
    Provides calculated financial metrics for a project.
    """
    # Estimates
    total_estimates: float = 0.0
    approved_estimates: float = 0.0
    pending_estimates: float = 0.0

    # Payments
    total_paid: float = 0.0
    balance_due: float = 0.0

    # Work Orders
    work_order_budget: float = 0.0

    # Labor
    total_labor_cost: float = 0.0
    total_labor_hours: float = 0.0
    billable_labor_cost: float = 0.0
    billable_labor_hours: float = 0.0

    # Materials/Expenses
    total_materials_cost: float = 0.0
    total_expenses: float = 0.0
    reimbursable_expenses: float = 0.0

    # Profitability
    gross_profit: float = 0.0
    gross_profit_percentage: float = 0.0

    # Counts
    estimate_count: int = 0
    payment_count: int = 0
    labor_entry_count: int = 0
    receipt_count: int = 0
    work_order_count: int = 0
