"""
Apex Assistant - Project Routes

REST endpoints for managing restoration projects and related entities.
This is the main router for the project management dashboard.
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
import sys
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
)

router = APIRouter()


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


@router.get("/projects/by-job/{job_number}")
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
    """
    try:
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
            client_id=project.client_id,
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
