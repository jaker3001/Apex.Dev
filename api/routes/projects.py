"""
Apex Assistant - Project Routes

REST endpoints for managing restoration projects and related entities.
This is the main router for the project management dashboard.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
import sys
import os
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import (
    # Project operations
    create_project,
    get_project,
    get_project_by_job_number,
    get_projects,
    get_project_full,
    get_project_stats,
    update_project,
    update_project_status,
    delete_project,
    # Project contact operations
    assign_contact_to_project,
    get_contacts_for_project,
    remove_contact_from_project,
    # Note operations
    create_note,
    get_notes_for_project,
    update_note,
    delete_note,
    # Estimate operations
    create_estimate,
    get_estimates_for_project,
    update_estimate,
    update_estimate_status,
    # Payment operations
    create_payment,
    get_payments_for_project,
    update_payment,
    # Media operations
    create_media,
    get_media,
    get_media_for_project,
    update_media,
    delete_media,
    # Client operations
    create_client,
    # Labor entry operations
    create_labor_entry,
    get_labor_entry,
    get_labor_entries_for_project,
    update_labor_entry,
    delete_labor_entry,
    # Receipt operations
    create_receipt,
    get_receipt,
    get_receipts_for_project,
    update_receipt,
    delete_receipt,
    # Work order operations
    create_work_order,
    get_work_order,
    get_work_orders_for_project,
    update_work_order,
    delete_work_order,
    # Activity log operations
    log_project_activity,
    get_activity_for_project,
    # Accounting operations
    get_project_accounting_summary,
    update_ready_to_invoice,
)

from api.schemas.operations import (
    # Project schemas
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectStatsResponse,
    ProjectFullResponse,
    # Project contact schemas
    ProjectContactCreate,
    ProjectContactResponse,
    ProjectContactListResponse,
    # Note schemas
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteListResponse,
    # Estimate schemas
    EstimateCreate,
    EstimateUpdate,
    EstimateResponse,
    EstimateListResponse,
    # Payment schemas
    PaymentCreate,
    PaymentUpdate,
    PaymentResponse,
    PaymentListResponse,
    # Media schemas
    MediaCreate,
    MediaUpdate,
    MediaResponse,
    MediaListResponse,
    # Labor entry schemas
    LaborEntryCreate,
    LaborEntryUpdate,
    LaborEntryResponse,
    LaborEntryListResponse,
    # Receipt schemas
    ReceiptCreate,
    ReceiptUpdate,
    ReceiptResponse,
    ReceiptListResponse,
    # Work order schemas
    WorkOrderCreate,
    WorkOrderUpdate,
    WorkOrderResponse,
    WorkOrderListResponse,
    # Activity log schemas
    ActivityLogResponse,
    ActivityLogListResponse,
    # Accounting schemas
    AccountingSummaryResponse,
)

router = APIRouter()


# =============================================================================
# JOB NUMBER GENERATION
# =============================================================================

# Job type acronyms
JOB_TYPE_ACRONYMS = {
    'mitigation': 'MIT',
    'reconstruction': 'RPR',
    'remodel': 'RMD',
    'abatement': 'ABT',
    'remediation': 'REM',
}


@router.get("/projects/next-job-number")
async def generate_job_number(job_type: str):
    """
    Generate the next available job number for a given job type.

    Format: YYYYMM-###-TYPE
    Example: 202512-001-MIT

    The sequence number (###) is unique within a month across ALL job types.
    This ensures no duplicate job numbers ever exist.
    """
    from datetime import datetime
    from database import get_ops_connection

    # Validate job type
    job_type_lower = job_type.lower()
    if job_type_lower not in JOB_TYPE_ACRONYMS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid job type. Must be one of: {', '.join(JOB_TYPE_ACRONYMS.keys())}"
        )

    acronym = JOB_TYPE_ACRONYMS[job_type_lower]

    # Get current year-month prefix
    now = datetime.now()
    prefix = f"{now.year}{str(now.month).zfill(2)}"

    conn = get_ops_connection()
    cursor = conn.cursor()

    # Find the highest existing sequence number for this month (across ALL types)
    cursor.execute(
        """
        SELECT job_number FROM projects
        WHERE job_number LIKE ?
        """,
        (f"{prefix}-%",)
    )

    existing = cursor.fetchall()

    # Build a set of all existing job numbers for uniqueness check
    existing_numbers = {row[0] for row in existing}

    # Find the highest sequence number
    max_seq = 0
    for job_num in existing_numbers:
        try:
            # Extract the ### part from YYYYMM-###-TYPE
            parts = job_num.split('-')
            if len(parts) >= 2:
                seq = int(parts[1])
                max_seq = max(max_seq, seq)
        except (ValueError, IndexError):
            continue

    # Generate next number, ensuring it doesn't exist
    next_seq = max_seq + 1
    job_number = f"{prefix}-{str(next_seq).zfill(3)}-{acronym}"

    # Double-check uniqueness (handles edge cases)
    while job_number in existing_numbers:
        next_seq += 1
        job_number = f"{prefix}-{str(next_seq).zfill(3)}-{acronym}"

    conn.close()

    return {
        "job_number": job_number,
        "job_type": job_type_lower,
        "acronym": acronym,
        "sequence": next_seq,
    }


# =============================================================================
# PROJECT ENDPOINTS
# =============================================================================

@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    status: Optional[str] = Query(default=None, description="Filter by status"),
    limit: int = Query(default=50, le=100),
    offset: int = Query(default=0, ge=0),
):
    """
    List all projects with optional filtering.

    Args:
        status: Filter by project status (lead, pending, active, complete, closed, cancelled)
        limit: Maximum number of projects to return
        offset: Number of projects to skip
    """
    projects = get_projects(status=status, limit=limit, offset=offset)

    # Get total count from stats
    stats = get_project_stats()
    if status:
        total = stats.get("by_status", {}).get(status, 0)
    else:
        total = stats.get("total", len(projects))

    return {
        "projects": projects,
        "total": total,
    }


@router.get("/projects/stats", response_model=ProjectStatsResponse)
async def get_stats():
    """
    Get project statistics for dashboard.

    Returns counts by status and totals.
    """
    stats = get_project_stats()
    return stats


@router.get("/projects/{project_id}", response_model=ProjectFullResponse)
async def get_project_detail(project_id: int):
    """
    Get a single project with all related data.

    Returns the project along with:
    - Client information
    - Insurance carrier
    - Assigned contacts
    - Notes
    - Estimates
    - Payments
    """
    result = get_project_full(project_id)

    if not result:
        raise HTTPException(status_code=404, detail="Project not found")

    return result


@router.get("/projects/by-job/{job_number}", response_model=ProjectResponse)
async def get_project_by_job(job_number: str):
    """
    Get a project by its job number.
    """
    project = get_project_by_job_number(job_number)

    if not project:
        raise HTTPException(status_code=404, detail=f"Project with job number '{job_number}' not found")

    return project


@router.post("/projects", response_model=ProjectResponse)
async def create_new_project(project: ProjectCreate):
    """
    Create a new project.

    Job number must be unique.
    If client_name is provided without client_id, a new client will be created.
    """
    try:
        # If client info is provided without client_id, create a client first
        client_id = project.client_id
        if project.client_name and not client_id:
            client_id = create_client(
                name=project.client_name,
                phone=project.client_phone,
                email=project.client_email,
                # Use project address for client if provided
                address=project.address,
                city=project.city,
                state=project.state,
                zip_code=project.zip,
            )

        project_id = create_project(
            job_number=project.job_number,
            status=project.status,
            address=project.address,
            city=project.city,
            state=project.state,
            zip_code=project.zip,
            year_built=project.year_built,
            structure_type=project.structure_type,
            square_footage=project.square_footage,
            num_stories=project.num_stories,
            damage_source=project.damage_source,
            damage_category=project.damage_category,
            damage_class=project.damage_class,
            date_of_loss=project.date_of_loss,
            date_contacted=project.date_contacted,
            inspection_date=project.inspection_date,
            work_auth_signed_date=project.work_auth_signed_date,
            start_date=project.start_date,
            cos_date=project.cos_date,
            completion_date=project.completion_date,
            claim_number=project.claim_number,
            policy_number=project.policy_number,
            deductible=project.deductible,
            client_id=client_id,
            insurance_org_id=project.insurance_org_id,
            notes=project.notes,
        )
    except Exception as e:
        if "UNIQUE constraint" in str(e):
            raise HTTPException(
                status_code=400,
                detail=f"Project with job number '{project.job_number}' already exists"
            )
        raise HTTPException(status_code=500, detail=str(e))

    return get_project(project_id)


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
async def update_existing_project(project_id: int, project: ProjectUpdate):
    """
    Update an existing project.

    Only provided fields will be updated.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    # Build update dict with only provided fields
    update_data = project.model_dump(exclude_unset=True)

    if update_data:
        update_project(project_id, **update_data)

    return get_project(project_id)


@router.patch("/projects/{project_id}/status")
async def change_project_status(project_id: int, status: str):
    """
    Update just the status of a project.

    Valid statuses: lead, pending, active, complete, closed, cancelled
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    valid_statuses = ["lead", "pending", "active", "complete", "closed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    update_project_status(project_id, status)

    return {"message": f"Project status updated to '{status}'"}


@router.delete("/projects/{project_id}")
async def remove_project(project_id: int):
    """
    Delete a project.

    Warning: This also removes all associated notes, estimates, payments, and contact assignments.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    delete_project(project_id)

    return {"message": "Project deleted successfully"}


# =============================================================================
# PROJECT CONTACT ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/contacts", response_model=ProjectContactListResponse)
async def list_project_contacts(project_id: int):
    """
    Get all contacts assigned to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    contacts = get_contacts_for_project(project_id)

    return {
        "contacts": contacts,
        "total": len(contacts),
    }


@router.post("/projects/{project_id}/contacts", response_model=ProjectContactResponse)
async def assign_contact(project_id: int, assignment: ProjectContactCreate):
    """
    Assign a contact to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    assignment_id = assign_contact_to_project(
        project_id=project_id,
        contact_id=assignment.contact_id,
        role_on_project=assignment.role_on_project,
        assigned_date=assignment.assigned_date,
        notes=assignment.notes,
    )

    # Get the contact details
    contacts = get_contacts_for_project(project_id)
    contact = next((c for c in contacts if c.get("id") == assignment_id), None)

    return contact or {"id": assignment_id, "project_id": project_id, "contact_id": assignment.contact_id}


@router.delete("/projects/{project_id}/contacts/{contact_id}")
async def remove_contact_assignment(project_id: int, contact_id: int):
    """
    Remove a contact from a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    remove_contact_from_project(project_id, contact_id)

    return {"message": "Contact removed from project"}


# =============================================================================
# NOTE ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/notes", response_model=NoteListResponse)
async def list_project_notes(project_id: int):
    """
    Get all notes for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    notes = get_notes_for_project(project_id)

    return {
        "notes": notes,
        "total": len(notes),
    }


@router.post("/projects/{project_id}/notes", response_model=NoteResponse)
async def create_project_note(project_id: int, note: NoteCreate):
    """
    Add a note to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    note_id = create_note(
        project_id=project_id,
        content=note.content,
        note_type=note.note_type,
        subject=note.subject,
        author_id=note.author_id,
    )

    # Get the created note
    notes = get_notes_for_project(project_id)
    created_note = next((n for n in notes if n.get("id") == note_id), None)

    return created_note or {"id": note_id, "project_id": project_id, "content": note.content}


@router.patch("/projects/{project_id}/notes/{note_id}", response_model=NoteResponse)
async def update_project_note(project_id: int, note_id: int, note: NoteUpdate):
    """
    Update a note.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = note.model_dump(exclude_unset=True)

    if update_data:
        update_note(note_id, **update_data)

    notes = get_notes_for_project(project_id)
    updated_note = next((n for n in notes if n.get("id") == note_id), None)

    if not updated_note:
        raise HTTPException(status_code=404, detail="Note not found")

    return updated_note


@router.delete("/projects/{project_id}/notes/{note_id}")
async def remove_project_note(project_id: int, note_id: int):
    """
    Delete a note.
    """
    delete_note(note_id)

    return {"message": "Note deleted successfully"}


# =============================================================================
# ESTIMATE ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/estimates", response_model=EstimateListResponse)
async def list_project_estimates(project_id: int):
    """
    Get all estimates for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    estimates = get_estimates_for_project(project_id)

    return {
        "estimates": estimates,
        "total": len(estimates),
    }


@router.post("/projects/{project_id}/estimates", response_model=EstimateResponse)
async def create_project_estimate(project_id: int, estimate: EstimateCreate):
    """
    Add an estimate to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    estimate_id = create_estimate(
        project_id=project_id,
        amount=estimate.amount,
        estimate_type=estimate.estimate_type,
        version=estimate.version,
        status=estimate.status,
        submitted_date=estimate.submitted_date,
        approved_date=estimate.approved_date,
        xactimate_file_path=estimate.xactimate_file_path,
        notes=estimate.notes,
        original_amount=estimate.original_amount,
    )

    estimates = get_estimates_for_project(project_id)
    created_estimate = next((e for e in estimates if e.get("id") == estimate_id), None)

    return created_estimate or {"id": estimate_id, "project_id": project_id, "amount": estimate.amount}


@router.patch("/projects/{project_id}/estimates/{estimate_id}", response_model=EstimateResponse)
async def update_project_estimate(project_id: int, estimate_id: int, estimate: EstimateUpdate):
    """
    Update an estimate.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = estimate.model_dump(exclude_unset=True)

    if update_data:
        update_estimate(estimate_id, **update_data)

    estimates = get_estimates_for_project(project_id)
    updated_estimate = next((e for e in estimates if e.get("id") == estimate_id), None)

    if not updated_estimate:
        raise HTTPException(status_code=404, detail="Estimate not found")

    return updated_estimate


@router.patch("/projects/{project_id}/estimates/{estimate_id}/status")
async def change_estimate_status(
    project_id: int,
    estimate_id: int,
    status: str,
    approved_date: Optional[str] = None,
):
    """
    Update just the status of an estimate.

    Valid statuses: draft, submitted, approved, revision_requested, denied
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    valid_statuses = ["draft", "submitted", "approved", "revision_requested", "denied"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    update_estimate_status(estimate_id, status, approved_date)

    return {"message": f"Estimate status updated to '{status}'"}


# Upload directory for estimate PDFs
ESTIMATES_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "estimates"
ESTIMATES_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/projects/{project_id}/estimates/upload")
async def upload_estimate_file(
    project_id: int,
    file: UploadFile = File(...),
):
    """
    Upload a PDF file for an estimate.

    Returns the file path that should be stored with the estimate record.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    # Create project-specific directory
    project_dir = ESTIMATES_UPLOAD_DIR / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_id = str(uuid.uuid4())
    original_name = Path(file.filename).stem
    stored_filename = f"{file_id}_{original_name}.pdf"
    file_path = project_dir / stored_filename

    # Save file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Return relative path for storage in database
    relative_path = f"estimates/{project_id}/{stored_filename}"

    return {
        "file_path": relative_path,
        "file_name": file.filename,
        "file_size": len(content),
    }


@router.get("/files/{file_path:path}")
async def serve_file(file_path: str):
    """
    Serve uploaded files (estimates, etc.)
    """
    # Base uploads directory
    uploads_dir = Path(__file__).parent.parent.parent / "uploads"
    full_path = uploads_dir / file_path

    # Security: ensure path doesn't escape uploads directory
    try:
        full_path.resolve().relative_to(uploads_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Determine media type
    media_type = "application/pdf" if full_path.suffix.lower() == ".pdf" else None

    # Set Content-Disposition to inline so browser displays instead of downloads
    headers = {"Content-Disposition": f"inline; filename=\"{full_path.name}\""}

    return FileResponse(
        path=str(full_path),
        media_type=media_type,
        headers=headers
    )


# =============================================================================
# PAYMENT ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/payments", response_model=PaymentListResponse)
async def list_project_payments(project_id: int):
    """
    Get all payments for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    payments = get_payments_for_project(project_id)

    return {
        "payments": payments,
        "total": len(payments),
    }


@router.post("/projects/{project_id}/payments", response_model=PaymentResponse)
async def create_project_payment(project_id: int, payment: PaymentCreate):
    """
    Record a payment for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    payment_id = create_payment(
        project_id=project_id,
        amount=payment.amount,
        estimate_id=payment.estimate_id,
        invoice_number=payment.invoice_number,
        payment_type=payment.payment_type,
        payment_method=payment.payment_method,
        check_number=payment.check_number,
        received_date=payment.received_date,
        deposited_date=payment.deposited_date,
        notes=payment.notes,
    )

    payments = get_payments_for_project(project_id)
    created_payment = next((p for p in payments if p.get("id") == payment_id), None)

    return created_payment or {"id": payment_id, "project_id": project_id, "amount": payment.amount}


@router.patch("/projects/{project_id}/payments/{payment_id}", response_model=PaymentResponse)
async def update_project_payment(project_id: int, payment_id: int, payment: PaymentUpdate):
    """
    Update a payment record.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = payment.model_dump(exclude_unset=True)

    if update_data:
        update_payment(payment_id, **update_data)

    payments = get_payments_for_project(project_id)
    updated_payment = next((p for p in payments if p.get("id") == payment_id), None)

    if not updated_payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    return updated_payment


# =============================================================================
# MEDIA ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/media", response_model=MediaListResponse)
async def list_project_media(
    project_id: int,
    file_type: Optional[str] = Query(default=None, description="Filter by file type"),
):
    """
    Get all media files for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    media = get_media_for_project(project_id, file_type=file_type)

    return {
        "media": media,
        "total": len(media),
    }


@router.post("/projects/{project_id}/media", response_model=MediaResponse)
async def create_project_media(project_id: int, media_item: MediaCreate):
    """
    Add a media file record to a project.

    Note: This creates the database record. Actual file upload should be handled
    separately (e.g., to cloud storage) with the file_path stored here.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    media_id = create_media(
        project_id=project_id,
        file_name=media_item.file_name,
        file_path=media_item.file_path,
        file_type=media_item.file_type,
        file_size=media_item.file_size,
        caption=media_item.caption,
        uploaded_by=media_item.uploaded_by,
    )

    media = get_media_for_project(project_id)
    created_media = next((m for m in media if m.get("id") == media_id), None)

    return created_media or {
        "id": media_id,
        "project_id": project_id,
        "file_name": media_item.file_name,
        "file_path": media_item.file_path,
    }


@router.patch("/projects/{project_id}/media/{media_id}", response_model=MediaResponse)
async def update_project_media(project_id: int, media_id: int, media_item: MediaUpdate):
    """
    Update a media record.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = media_item.model_dump(exclude_unset=True)

    if update_data:
        update_media(media_id, **update_data)

    media = get_media_for_project(project_id)
    updated_media = next((m for m in media if m.get("id") == media_id), None)

    if not updated_media:
        raise HTTPException(status_code=404, detail="Media not found")

    return updated_media


@router.delete("/projects/{project_id}/media/{media_id}")
async def remove_project_media(project_id: int, media_id: int):
    """
    Delete a media record.

    Note: This only removes the database record. The actual file should be
    deleted separately from storage.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    deleted = delete_media(media_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Media not found")

    return {"message": "Media deleted successfully"}


# =============================================================================
# LABOR ENTRY ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/labor", response_model=LaborEntryListResponse)
async def list_project_labor_entries(project_id: int):
    """
    Get all labor entries for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    entries = get_labor_entries_for_project(project_id)

    return {
        "labor_entries": entries,
        "total": len(entries),
    }


@router.post("/projects/{project_id}/labor", response_model=LaborEntryResponse)
async def create_project_labor_entry(project_id: int, entry: LaborEntryCreate):
    """
    Add a labor entry to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    entry_id = create_labor_entry(
        project_id=project_id,
        employee_id=entry.employee_id,
        work_date=entry.work_date,
        hours=entry.hours,
        hourly_rate=entry.hourly_rate,
        work_category=entry.work_category,
        description=entry.description,
        billable=entry.billable,
        created_by=entry.created_by,
    )

    entries = get_labor_entries_for_project(project_id)
    created_entry = next((e for e in entries if e.get("id") == entry_id), None)

    return created_entry or {"id": entry_id, "project_id": project_id, "hours": entry.hours}


@router.patch("/projects/{project_id}/labor/{labor_id}", response_model=LaborEntryResponse)
async def update_project_labor_entry(project_id: int, labor_id: int, entry: LaborEntryUpdate):
    """
    Update a labor entry.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = entry.model_dump(exclude_unset=True)

    if update_data:
        update_labor_entry(labor_id, **update_data)

    entries = get_labor_entries_for_project(project_id)
    updated_entry = next((e for e in entries if e.get("id") == labor_id), None)

    if not updated_entry:
        raise HTTPException(status_code=404, detail="Labor entry not found")

    return updated_entry


@router.delete("/projects/{project_id}/labor/{labor_id}")
async def remove_project_labor_entry(project_id: int, labor_id: int):
    """
    Delete a labor entry.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    deleted = delete_labor_entry(labor_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Labor entry not found")

    return {"message": "Labor entry deleted successfully"}


# =============================================================================
# RECEIPT ENDPOINTS
# =============================================================================

# Upload directory for receipts
RECEIPTS_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "receipts"
RECEIPTS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.get("/projects/{project_id}/receipts", response_model=ReceiptListResponse)
async def list_project_receipts(project_id: int):
    """
    Get all receipts for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    receipts = get_receipts_for_project(project_id)

    return {
        "receipts": receipts,
        "total": len(receipts),
    }


@router.post("/projects/{project_id}/receipts", response_model=ReceiptResponse)
async def create_project_receipt(project_id: int, receipt: ReceiptCreate):
    """
    Add a receipt to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    receipt_id = create_receipt(
        project_id=project_id,
        vendor_id=receipt.vendor_id,
        expense_category=receipt.expense_category,
        description=receipt.description,
        amount=receipt.amount,
        expense_date=receipt.expense_date,
        receipt_file_path=receipt.receipt_file_path,
        reimbursable=receipt.reimbursable,
        paid_by=receipt.paid_by,
        created_by=receipt.created_by,
    )

    receipts = get_receipts_for_project(project_id)
    created_receipt = next((r for r in receipts if r.get("id") == receipt_id), None)

    return created_receipt or {"id": receipt_id, "project_id": project_id, "amount": receipt.amount}


@router.post("/projects/{project_id}/receipts/upload")
async def upload_receipt_file(
    project_id: int,
    file: UploadFile = File(...),
):
    """
    Upload a receipt file (image or PDF).

    Returns the file path that should be stored with the receipt record.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Create project-specific directory
    project_dir = RECEIPTS_UPLOAD_DIR / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_id = str(uuid.uuid4())
    original_name = Path(file.filename or "receipt").stem
    stored_filename = f"{file_id}_{original_name}{file_ext}"
    file_path = project_dir / stored_filename

    # Save file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Return relative path for storage in database
    relative_path = f"receipts/{project_id}/{stored_filename}"

    return {
        "file_path": relative_path,
        "file_name": file.filename,
        "file_size": len(content),
    }


@router.patch("/projects/{project_id}/receipts/{receipt_id}", response_model=ReceiptResponse)
async def update_project_receipt(project_id: int, receipt_id: int, receipt: ReceiptUpdate):
    """
    Update a receipt.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = receipt.model_dump(exclude_unset=True)

    if update_data:
        update_receipt(receipt_id, **update_data)

    receipts = get_receipts_for_project(project_id)
    updated_receipt = next((r for r in receipts if r.get("id") == receipt_id), None)

    if not updated_receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    return updated_receipt


@router.delete("/projects/{project_id}/receipts/{receipt_id}")
async def remove_project_receipt(project_id: int, receipt_id: int):
    """
    Delete a receipt.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    deleted = delete_receipt(receipt_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Receipt not found")

    return {"message": "Receipt deleted successfully"}


# =============================================================================
# WORK ORDER ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/work-orders", response_model=WorkOrderListResponse)
async def list_project_work_orders(project_id: int):
    """
    Get all work orders for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    work_orders = get_work_orders_for_project(project_id)

    return {
        "work_orders": work_orders,
        "total": len(work_orders),
    }


@router.post("/projects/{project_id}/work-orders", response_model=WorkOrderResponse)
async def create_project_work_order(project_id: int, work_order: WorkOrderCreate):
    """
    Add a work order to a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    work_order_id = create_work_order(
        project_id=project_id,
        work_order_number=work_order.work_order_number,
        title=work_order.title,
        description=work_order.description,
        budget_amount=work_order.budget_amount,
        status=work_order.status,
        document_file_path=work_order.document_file_path,
    )

    work_orders = get_work_orders_for_project(project_id)
    created_work_order = next((w for w in work_orders if w.get("id") == work_order_id), None)

    return created_work_order or {"id": work_order_id, "project_id": project_id, "title": work_order.title}


@router.patch("/projects/{project_id}/work-orders/{work_order_id}", response_model=WorkOrderResponse)
async def update_project_work_order(project_id: int, work_order_id: int, work_order: WorkOrderUpdate):
    """
    Update a work order.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = work_order.model_dump(exclude_unset=True)

    if update_data:
        update_work_order(work_order_id, **update_data)

    work_orders = get_work_orders_for_project(project_id)
    updated_work_order = next((w for w in work_orders if w.get("id") == work_order_id), None)

    if not updated_work_order:
        raise HTTPException(status_code=404, detail="Work order not found")

    return updated_work_order


@router.delete("/projects/{project_id}/work-orders/{work_order_id}")
async def remove_project_work_order(project_id: int, work_order_id: int):
    """
    Delete a work order.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    deleted = delete_work_order(work_order_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Work order not found")

    return {"message": "Work order deleted successfully"}


# Upload directory for work orders
WORKORDERS_UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads" / "workorders"
WORKORDERS_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/projects/{project_id}/work-orders/upload")
async def upload_work_order_file(
    project_id: int,
    file: UploadFile = File(...),
):
    """
    Upload a work order document file (image or PDF).

    Returns the file path that should be stored with the work order record.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    # Validate file type
    allowed_extensions = {'.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp'}
    file_ext = Path(file.filename or "").suffix.lower()
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}"
        )

    # Create project-specific directory
    project_dir = WORKORDERS_UPLOAD_DIR / str(project_id)
    project_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename
    file_id = str(uuid.uuid4())
    original_name = Path(file.filename or "workorder").stem
    stored_filename = f"{file_id}_{original_name}{file_ext}"
    file_path = project_dir / stored_filename

    # Save file
    try:
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Return relative path for storage in database
    relative_path = f"workorders/{project_id}/{stored_filename}"

    return {
        "file_path": relative_path,
        "file_name": file.filename,
        "file_size": len(content),
    }


# =============================================================================
# ACTIVITY LOG ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/activity", response_model=ActivityLogListResponse)
async def list_project_activity(
    project_id: int,
    event_types: Optional[str] = Query(default=None, description="Comma-separated event types to filter"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    """
    Get activity log for a project.

    Optionally filter by event types (comma-separated).
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    # Parse event types filter
    event_type_list = None
    if event_types:
        event_type_list = [t.strip() for t in event_types.split(",")]

    activities = get_activity_for_project(
        project_id,
        event_types=event_type_list,
        limit=limit,
        offset=offset,
    )

    return {
        "activities": activities,
        "total": len(activities),
    }


# =============================================================================
# ACCOUNTING ENDPOINTS
# =============================================================================

@router.get("/projects/{project_id}/accounting-summary", response_model=AccountingSummaryResponse)
async def get_accounting_summary(project_id: int):
    """
    Get calculated accounting metrics for a project.

    Returns totals for estimates, payments, labor, materials, and profit margins.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    summary = get_project_accounting_summary(project_id)

    return summary


@router.patch("/projects/{project_id}/ready-to-invoice")
async def toggle_ready_to_invoice(project_id: int, ready: bool):
    """
    Toggle the ready-to-invoice flag for a project.
    """
    existing = get_project(project_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Project not found")

    update_ready_to_invoice(project_id, ready)

    return {"message": f"Ready to invoice set to {ready}", "ready_to_invoice": ready}
