"""
Apex Operations Database Operations

CRUD operations for the apex_operations.db database.
All functions follow a consistent pattern for creating, reading, updating, and deleting records.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from .schema_apex import get_ops_connection


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _row_to_dict(row) -> Optional[Dict[str, Any]]:
    """Convert a sqlite3.Row to a dictionary."""
    if row is None:
        return None
    return dict(row)


def _rows_to_list(rows) -> List[Dict[str, Any]]:
    """Convert a list of sqlite3.Row objects to a list of dictionaries."""
    return [dict(row) for row in rows]


def _get_timestamp() -> str:
    """Get current timestamp in ISO format."""
    return datetime.now().isoformat()


# =============================================================================
# ORGANIZATION OPERATIONS
# =============================================================================

def create_organization(
    name: str,
    org_type: str,
    address: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    phone: Optional[str] = None,
    website: Optional[str] = None,
    has_msa: bool = False,
    trade_category: Optional[str] = None,
    notes: Optional[str] = None,
) -> int:
    """Create a new organization and return its ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO organizations (name, org_type, address, city, state, zip, phone, website, has_msa, trade_category, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (name, org_type, address, city, state, zip_code, phone, website, 1 if has_msa else 0, trade_category, notes)
    )
    org_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return org_id


def get_organization(org_id: int) -> Optional[Dict[str, Any]]:
    """Get an organization by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM organizations WHERE id = ?", (org_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_organizations(
    org_type: Optional[str] = None,
    active_only: bool = True,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """Get organizations with optional filtering."""
    conn = get_ops_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM organizations WHERE 1=1"
    params = []

    if active_only:
        query += " AND is_active = 1"
    if org_type:
        query += " AND org_type = ?"
        params.append(org_type)

    query += " ORDER BY name LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_organization(org_id: int, **kwargs) -> bool:
    """Update an organization. Pass field names as keyword arguments."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    # Build SET clause dynamically
    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(org_id)

    query = f"UPDATE organizations SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_organization(org_id: int) -> bool:
    """Delete an organization (soft delete by setting is_active = 0)."""
    return update_organization(org_id, is_active=0)


# =============================================================================
# CONTACT OPERATIONS
# =============================================================================

def create_contact(
    first_name: str,
    last_name: str,
    organization_id: Optional[int] = None,
    role: Optional[str] = None,
    phone: Optional[str] = None,
    phone_extension: Optional[str] = None,
    email: Optional[str] = None,
    notes: Optional[str] = None,
) -> int:
    """Create a new contact and return its ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO contacts (organization_id, first_name, last_name, role, phone, phone_extension, email, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (organization_id, first_name, last_name, role, phone, phone_extension, email, notes)
    )
    contact_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return contact_id


def get_contact(contact_id: int) -> Optional[Dict[str, Any]]:
    """Get a contact by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM v_contacts WHERE id = ?", (contact_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_contacts_by_organization(org_id: int) -> List[Dict[str, Any]]:
    """Get all contacts for an organization."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM contacts WHERE organization_id = ? AND is_active = 1 ORDER BY last_name, first_name",
        (org_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def get_all_contacts(limit: int = 500) -> List[Dict[str, Any]]:
    """Get all active contacts."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT * FROM v_contacts
        WHERE is_active = 1
        ORDER BY full_name
        LIMIT ?
        """,
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def search_contacts(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Search contacts by name or email."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    search_term = f"%{query}%"
    cursor.execute(
        """
        SELECT * FROM v_contacts
        WHERE full_name LIKE ? OR email LIKE ?
        ORDER BY full_name
        LIMIT ?
        """,
        (search_term, search_term, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_contact(contact_id: int, **kwargs) -> bool:
    """Update a contact. Pass field names as keyword arguments."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(contact_id)

    query = f"UPDATE contacts SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_contact(contact_id: int) -> bool:
    """Delete a contact (soft delete)."""
    return update_contact(contact_id, is_active=0)


# =============================================================================
# CLIENT OPERATIONS
# =============================================================================

def create_client(
    name: str,
    client_type: Optional[str] = None,
    phone: Optional[str] = None,
    email: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    notes: Optional[str] = None,
) -> int:
    """Create a new client and return its ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO clients (name, client_type, phone, email, address, city, state, zip, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (name, client_type, phone, email, address, city, state, zip_code, notes)
    )
    client_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return client_id


def get_client(client_id: int) -> Optional[Dict[str, Any]]:
    """Get a client by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clients WHERE id = ?", (client_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_clients(active_only: bool = True, limit: int = 100) -> List[Dict[str, Any]]:
    """Get all clients."""
    conn = get_ops_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM clients"
    if active_only:
        query += " WHERE is_active = 1"
    query += " ORDER BY name LIMIT ?"

    cursor.execute(query, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def search_clients(query: str, limit: int = 50) -> List[Dict[str, Any]]:
    """Search clients by name."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    search_term = f"%{query}%"
    cursor.execute(
        "SELECT * FROM clients WHERE name LIKE ? AND is_active = 1 ORDER BY name LIMIT ?",
        (search_term, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_client(client_id: int, **kwargs) -> bool:
    """Update a client. Pass field names as keyword arguments."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(client_id)

    query = f"UPDATE clients SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_client(client_id: int) -> bool:
    """Delete a client (soft delete)."""
    return update_client(client_id, is_active=0)


# =============================================================================
# PROJECT OPERATIONS
# =============================================================================

def create_project(
    job_number: str,
    client_id: Optional[int] = None,
    insurance_org_id: Optional[int] = None,
    status: str = "lead",
    address: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    year_built: Optional[int] = None,
    structure_type: Optional[str] = None,
    square_footage: Optional[int] = None,
    num_stories: Optional[int] = None,
    damage_source: Optional[str] = None,
    damage_category: Optional[str] = None,
    damage_class: Optional[str] = None,
    date_of_loss: Optional[str] = None,
    date_contacted: Optional[str] = None,
    inspection_date: Optional[str] = None,
    work_auth_signed_date: Optional[str] = None,
    start_date: Optional[str] = None,
    cos_date: Optional[str] = None,
    completion_date: Optional[str] = None,
    claim_number: Optional[str] = None,
    policy_number: Optional[str] = None,
    deductible: Optional[float] = None,
    notes: Optional[str] = None,
) -> int:
    """Create a new project and return its ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO projects (
            job_number, client_id, insurance_org_id, status, address, city, state, zip,
            year_built, structure_type, square_footage, num_stories,
            damage_source, damage_category, damage_class, date_of_loss,
            date_contacted, inspection_date, work_auth_signed_date, start_date,
            cos_date, completion_date, claim_number, policy_number, deductible, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            job_number, client_id, insurance_org_id, status, address, city, state, zip_code,
            year_built, structure_type, square_footage, num_stories,
            damage_source, damage_category, damage_class, date_of_loss,
            date_contacted or _get_timestamp(), inspection_date, work_auth_signed_date,
            start_date, cos_date, completion_date, claim_number, policy_number, deductible, notes
        )
    )
    project_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return project_id


def get_project(project_id: int) -> Optional[Dict[str, Any]]:
    """Get a project by ID using the view for joined data."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM v_projects WHERE id = ?", (project_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_project_by_job_number(job_number: str) -> Optional[Dict[str, Any]]:
    """Get a project by job number."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM v_projects WHERE job_number = ?", (job_number,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_projects(
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get projects with optional filtering and pagination."""
    conn = get_ops_connection()
    cursor = conn.cursor()

    query = "SELECT * FROM v_projects WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)
    if client_id:
        query += " AND id IN (SELECT id FROM projects WHERE client_id = ?)"
        params.append(client_id)

    query += " ORDER BY job_number DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def get_project_full(project_id: int) -> Optional[Dict[str, Any]]:
    """
    Get a project with all related data (contacts, notes, estimates, payments).
    This is the main function for the dashboard detail view.
    """
    conn = get_ops_connection()
    cursor = conn.cursor()

    # Get project with client and carrier info
    cursor.execute("SELECT * FROM v_projects WHERE id = ?", (project_id,))
    project = cursor.fetchone()
    if not project:
        conn.close()
        return None

    project_dict = dict(project)

    # Get full project record for additional fields
    cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
    full_project = cursor.fetchone()
    if full_project:
        full_dict = dict(full_project)
        # Merge additional fields
        project_dict.update({
            'date_of_loss': full_dict.get('date_of_loss'),
            'date_contacted': full_dict.get('date_contacted'),
            'inspection_date': full_dict.get('inspection_date'),
            'work_auth_signed_date': full_dict.get('work_auth_signed_date'),
            'start_date': full_dict.get('start_date'),
            'cos_date': full_dict.get('cos_date'),
            'completion_date': full_dict.get('completion_date'),
            'policy_number': full_dict.get('policy_number'),
            'deductible': full_dict.get('deductible'),
            'year_built': full_dict.get('year_built'),
            'structure_type': full_dict.get('structure_type'),
            'square_footage': full_dict.get('square_footage'),
            'damage_class': full_dict.get('damage_class'),
        })

    # Get client details
    cursor.execute(
        "SELECT * FROM clients WHERE id = (SELECT client_id FROM projects WHERE id = ?)",
        (project_id,)
    )
    client = cursor.fetchone()
    project_dict['client'] = _row_to_dict(client)

    # Get carrier details
    cursor.execute(
        "SELECT * FROM organizations WHERE id = (SELECT insurance_org_id FROM projects WHERE id = ?)",
        (project_id,)
    )
    carrier = cursor.fetchone()
    project_dict['carrier'] = _row_to_dict(carrier)

    # Get assigned contacts with organization info
    cursor.execute(
        """
        SELECT c.*, org.name as organization_name, org.org_type, pc.role_on_project
        FROM project_contacts pc
        JOIN contacts c ON pc.contact_id = c.id
        LEFT JOIN organizations org ON c.organization_id = org.id
        WHERE pc.project_id = ?
        ORDER BY pc.role_on_project, c.last_name
        """,
        (project_id,)
    )
    contacts = cursor.fetchall()
    project_dict['contacts'] = _rows_to_list(contacts)

    # Get notes
    cursor.execute(
        """
        SELECT n.*, c.first_name || ' ' || c.last_name as author_name
        FROM notes n
        LEFT JOIN contacts c ON n.author_id = c.id
        WHERE n.project_id = ?
        ORDER BY n.created_at DESC
        """,
        (project_id,)
    )
    notes = cursor.fetchall()
    project_dict['notes'] = _rows_to_list(notes)

    # Get estimates
    cursor.execute(
        "SELECT * FROM estimates WHERE project_id = ? ORDER BY version DESC",
        (project_id,)
    )
    estimates = cursor.fetchall()
    project_dict['estimates'] = _rows_to_list(estimates)

    # Get payments
    cursor.execute(
        "SELECT * FROM payments WHERE project_id = ? ORDER BY received_date DESC",
        (project_id,)
    )
    payments = cursor.fetchall()
    project_dict['payments'] = _rows_to_list(payments)

    # Get media files
    cursor.execute(
        """
        SELECT m.*, c.first_name || ' ' || c.last_name as uploaded_by_name
        FROM media m
        LEFT JOIN contacts c ON m.uploaded_by = c.id
        WHERE m.project_id = ?
        ORDER BY m.uploaded_at DESC
        """,
        (project_id,)
    )
    media = cursor.fetchall()
    project_dict['media'] = _rows_to_list(media)

    # Get labor entries
    cursor.execute(
        """
        SELECT le.*, c.first_name || ' ' || c.last_name as employee_name
        FROM labor_entries le
        LEFT JOIN contacts c ON le.employee_id = c.id
        WHERE le.project_id = ?
        ORDER BY le.work_date DESC, le.created_at DESC
        """,
        (project_id,)
    )
    labor_entries = cursor.fetchall()
    project_dict['labor_entries'] = _rows_to_list(labor_entries)

    # Get receipts
    cursor.execute(
        """
        SELECT r.*, org.name as vendor_name
        FROM receipts r
        LEFT JOIN organizations org ON r.vendor_id = org.id
        WHERE r.project_id = ?
        ORDER BY r.expense_date DESC, r.created_at DESC
        """,
        (project_id,)
    )
    receipts = cursor.fetchall()
    project_dict['receipts'] = _rows_to_list(receipts)

    # Get work orders
    cursor.execute(
        "SELECT * FROM work_orders WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,)
    )
    work_orders = cursor.fetchall()
    project_dict['work_orders'] = _rows_to_list(work_orders)

    conn.close()

    # Get accounting summary (uses separate connection)
    project_dict['accounting_summary'] = get_project_accounting_summary(project_id)

    return project_dict


def get_project_stats() -> Dict[str, Any]:
    """Get project statistics for the dashboard."""
    conn = get_ops_connection()
    cursor = conn.cursor()

    stats = {}

    # Count by status
    cursor.execute("""
        SELECT status, COUNT(*) as count FROM projects GROUP BY status
    """)
    status_counts = {row['status']: row['count'] for row in cursor.fetchall()}
    stats['by_status'] = status_counts
    stats['total'] = sum(status_counts.values())
    stats['active'] = status_counts.get('active', 0)
    stats['lead'] = status_counts.get('lead', 0)
    stats['complete'] = status_counts.get('complete', 0)

    conn.close()
    return stats


def update_project(project_id: int, **kwargs) -> bool:
    """Update a project. Pass field names as keyword arguments."""
    if not kwargs:
        return False

    # Add updated_at timestamp
    kwargs['updated_at'] = _get_timestamp()

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(project_id)

    query = f"UPDATE projects SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def update_project_status(project_id: int, status: str) -> bool:
    """Update just the project status."""
    return update_project(project_id, status=status)


def delete_project(project_id: int) -> bool:
    """Delete a project (sets status to 'cancelled')."""
    return update_project(project_id, status='cancelled')


# =============================================================================
# PROJECT CONTACTS OPERATIONS
# =============================================================================

def assign_contact_to_project(
    project_id: int,
    contact_id: int,
    role_on_project: Optional[str] = None,
    assigned_date: Optional[str] = None,
    notes: Optional[str] = None,
) -> int:
    """Assign a contact to a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO project_contacts (project_id, contact_id, role_on_project, assigned_date, notes)
        VALUES (?, ?, ?, ?, ?)
        """,
        (project_id, contact_id, role_on_project, assigned_date or _get_timestamp(), notes)
    )
    pc_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return pc_id


def get_contacts_for_project(project_id: int) -> List[Dict[str, Any]]:
    """Get all contacts assigned to a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT c.*, org.name as organization_name, org.org_type, pc.role_on_project, pc.id as assignment_id
        FROM project_contacts pc
        JOIN contacts c ON pc.contact_id = c.id
        LEFT JOIN organizations org ON c.organization_id = org.id
        WHERE pc.project_id = ?
        ORDER BY pc.role_on_project, c.last_name
        """,
        (project_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def remove_contact_from_project(project_id: int, contact_id: int) -> bool:
    """Remove a contact from a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM project_contacts WHERE project_id = ? AND contact_id = ?",
        (project_id, contact_id)
    )
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# NOTE OPERATIONS
# =============================================================================

def create_note(
    project_id: int,
    content: str,
    note_type: Optional[str] = None,
    subject: Optional[str] = None,
    author_id: Optional[int] = None,
) -> int:
    """Create a new note for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO notes (project_id, author_id, note_type, subject, content)
        VALUES (?, ?, ?, ?, ?)
        """,
        (project_id, author_id, note_type, subject, content)
    )
    note_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Log activity
    type_str = f" ({note_type})" if note_type else ""
    preview = content[:100] + "..." if len(content) > 100 else content
    log_project_activity(
        project_id=project_id,
        event_type="note_added",
        event_subtype=note_type,
        description=f"Note added{type_str}: {subject or preview}",
        entity_type="note",
        entity_id=note_id,
        actor_id=author_id,
    )

    return note_id


def get_notes_for_project(project_id: int, limit: int = 50) -> List[Dict[str, Any]]:
    """Get notes for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT n.*, c.first_name || ' ' || c.last_name as author_name
        FROM notes n
        LEFT JOIN contacts c ON n.author_id = c.id
        WHERE n.project_id = ?
        ORDER BY n.created_at DESC
        LIMIT ?
        """,
        (project_id, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_note(note_id: int, **kwargs) -> bool:
    """Update a note."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(note_id)

    query = f"UPDATE notes SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_note(note_id: int) -> bool:
    """Delete a note (hard delete)."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM notes WHERE id = ?", (note_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# ESTIMATE OPERATIONS
# =============================================================================

def create_estimate(
    project_id: int,
    amount: float,
    estimate_type: Optional[str] = None,
    version: int = 1,
    status: str = "draft",
    submitted_date: Optional[str] = None,
    approved_date: Optional[str] = None,
    xactimate_file_path: Optional[str] = None,
    notes: Optional[str] = None,
    original_amount: Optional[float] = None,
) -> int:
    """Create a new estimate for a project.

    For initial estimates (version 1), original_amount should equal amount.
    For revisions, original_amount carries forward from the initial submission.
    """
    conn = get_ops_connection()
    cursor = conn.cursor()

    # If original_amount not provided and this is version 1, use the amount
    if original_amount is None and version == 1:
        original_amount = amount

    cursor.execute(
        """
        INSERT INTO estimates (project_id, version, estimate_type, amount, original_amount, status, submitted_date, approved_date, xactimate_file_path, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, version, estimate_type, amount, original_amount, status, submitted_date, approved_date, xactimate_file_path, notes)
    )
    estimate_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Log activity
    type_str = f" ({estimate_type})" if estimate_type else ""
    version_str = f" v{version}" if version > 1 else ""
    log_project_activity(
        project_id=project_id,
        event_type="estimate_created",
        event_subtype=status,
        description=f"Estimate{type_str}{version_str} created for ${amount:,.2f}",
        entity_type="estimate",
        entity_id=estimate_id,
        amount=amount,
    )

    return estimate_id


def get_estimates_for_project(project_id: int) -> List[Dict[str, Any]]:
    """Get all estimates for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM estimates WHERE project_id = ? ORDER BY version DESC",
        (project_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_estimate(estimate_id: int, **kwargs) -> bool:
    """Update an estimate."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(estimate_id)

    query = f"UPDATE estimates SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def update_estimate_status(
    estimate_id: int,
    status: str,
    approved_date: Optional[str] = None
) -> bool:
    """Update estimate status and optionally set approved date."""
    # Get estimate details for logging
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT project_id, amount, estimate_type, status as old_status FROM estimates WHERE id = ?", (estimate_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return False

    estimate_data = dict(row)
    old_status = estimate_data.get('old_status')

    kwargs = {'status': status}
    if approved_date:
        kwargs['approved_date'] = approved_date
    elif status == 'approved':
        kwargs['approved_date'] = _get_timestamp()
    result = update_estimate(estimate_id, **kwargs)

    # Log activity
    if result:
        type_str = f" ({estimate_data.get('estimate_type')})" if estimate_data.get('estimate_type') else ""
        log_project_activity(
            project_id=estimate_data['project_id'],
            event_type="estimate_status_changed",
            event_subtype=status,
            description=f"Estimate{type_str} {status}" + (f" (${estimate_data['amount']:,.2f})" if status == 'approved' else ""),
            entity_type="estimate",
            entity_id=estimate_id,
            old_value=old_status,
            new_value=status,
            amount=estimate_data['amount'] if status == 'approved' else None,
        )

    return result


# =============================================================================
# PAYMENT OPERATIONS
# =============================================================================

def create_payment(
    project_id: int,
    amount: float,
    estimate_id: Optional[int] = None,
    invoice_number: Optional[str] = None,
    payment_type: Optional[str] = None,
    payment_method: Optional[str] = None,
    check_number: Optional[str] = None,
    received_date: Optional[str] = None,
    deposited_date: Optional[str] = None,
    notes: Optional[str] = None,
) -> int:
    """Record a payment for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO payments (
            project_id, estimate_id, invoice_number, amount, payment_type,
            payment_method, check_number, received_date, deposited_date, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            project_id, estimate_id, invoice_number, amount, payment_type,
            payment_method, check_number, received_date or _get_timestamp(), deposited_date, notes
        )
    )
    payment_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Log activity
    method_str = f" via {payment_method}" if payment_method else ""
    type_str = f" ({payment_type})" if payment_type else ""
    log_project_activity(
        project_id=project_id,
        event_type="payment_received",
        event_subtype=payment_type,
        description=f"Payment{type_str} received: ${amount:,.2f}{method_str}",
        entity_type="payment",
        entity_id=payment_id,
        amount=amount,
    )

    return payment_id


def get_payments_for_project(project_id: int) -> List[Dict[str, Any]]:
    """Get all payments for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM payments WHERE project_id = ? ORDER BY received_date DESC",
        (project_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_payment(payment_id: int, **kwargs) -> bool:
    """Update a payment record."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(payment_id)

    query = f"UPDATE payments SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# MEDIA OPERATIONS
# =============================================================================

def create_media(
    project_id: int,
    file_name: str,
    file_path: str,
    file_type: Optional[str] = None,
    file_size: Optional[int] = None,
    caption: Optional[str] = None,
    uploaded_by: Optional[int] = None,
) -> int:
    """Create a new media record for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO media (project_id, file_name, file_path, file_type, file_size, caption, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, file_name, file_path, file_type, file_size, caption, uploaded_by)
    )
    media_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return media_id


def get_media(media_id: int) -> Optional[Dict[str, Any]]:
    """Get a media record by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM media WHERE id = ?", (media_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_media_for_project(project_id: int, file_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all media for a project, optionally filtered by file type."""
    conn = get_ops_connection()
    cursor = conn.cursor()

    query = """
        SELECT m.*, c.first_name || ' ' || c.last_name as uploaded_by_name
        FROM media m
        LEFT JOIN contacts c ON m.uploaded_by = c.id
        WHERE m.project_id = ?
    """
    params = [project_id]

    if file_type:
        query += " AND m.file_type = ?"
        params.append(file_type)

    query += " ORDER BY m.uploaded_at DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_media(media_id: int, **kwargs) -> bool:
    """Update a media record."""
    if not kwargs:
        return False

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(media_id)

    query = f"UPDATE media SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_media(media_id: int) -> bool:
    """Delete a media record (hard delete)."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM media WHERE id = ?", (media_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# LABOR ENTRY OPERATIONS
# =============================================================================

def create_labor_entry(
    project_id: int,
    work_date: str,
    hours: float,
    employee_id: Optional[int] = None,
    hourly_rate: Optional[float] = None,
    work_category: Optional[str] = None,
    description: Optional[str] = None,
    billable: bool = True,
    created_by: Optional[int] = None,
) -> int:
    """Create a new labor entry for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO labor_entries (
            project_id, employee_id, work_date, hours, hourly_rate,
            work_category, description, billable, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, employee_id, work_date, hours, hourly_rate,
         work_category, description, 1 if billable else 0, created_by)
    )
    entry_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Log activity
    cost = (hours * hourly_rate) if hourly_rate else None
    category_str = f" ({work_category})" if work_category else ""
    log_project_activity(
        project_id=project_id,
        event_type="labor_logged",
        description=f"Logged {hours} hours{category_str}" + (f": {description}" if description else ""),
        entity_type="labor",
        entity_id=entry_id,
        amount=cost,
        actor_id=created_by,
    )

    return entry_id


def get_labor_entry(entry_id: int) -> Optional[Dict[str, Any]]:
    """Get a labor entry by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT le.*, c.first_name || ' ' || c.last_name as employee_name
        FROM labor_entries le
        LEFT JOIN contacts c ON le.employee_id = c.id
        WHERE le.id = ?
        """,
        (entry_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_labor_entries_for_project(project_id: int) -> List[Dict[str, Any]]:
    """Get all labor entries for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT le.*, c.first_name || ' ' || c.last_name as employee_name
        FROM labor_entries le
        LEFT JOIN contacts c ON le.employee_id = c.id
        WHERE le.project_id = ?
        ORDER BY le.work_date DESC, le.created_at DESC
        """,
        (project_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_labor_entry(entry_id: int, **kwargs) -> bool:
    """Update a labor entry."""
    if not kwargs:
        return False

    kwargs['updated_at'] = _get_timestamp()

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(entry_id)

    query = f"UPDATE labor_entries SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_labor_entry(entry_id: int) -> bool:
    """Delete a labor entry (hard delete)."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM labor_entries WHERE id = ?", (entry_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# RECEIPT OPERATIONS
# =============================================================================

def create_receipt(
    project_id: int,
    expense_category: str,
    description: str,
    amount: float,
    expense_date: str,
    vendor_id: Optional[int] = None,
    receipt_file_path: Optional[str] = None,
    reimbursable: bool = False,
    paid_by: Optional[str] = None,
    created_by: Optional[int] = None,
) -> int:
    """Create a new receipt/expense for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO receipts (
            project_id, vendor_id, expense_category, description, amount,
            expense_date, receipt_file_path, reimbursable, paid_by, created_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, vendor_id, expense_category, description, amount,
         expense_date, receipt_file_path, 1 if reimbursable else 0, paid_by, created_by)
    )
    receipt_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Log activity
    category_display = expense_category.replace('_', ' ').title()
    log_project_activity(
        project_id=project_id,
        event_type="receipt_added",
        event_subtype=expense_category,
        description=f"Expense ({category_display}): ${amount:,.2f} - {description}",
        entity_type="receipt",
        entity_id=receipt_id,
        amount=amount,
        actor_id=created_by,
    )

    return receipt_id


def get_receipt(receipt_id: int) -> Optional[Dict[str, Any]]:
    """Get a receipt by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT r.*, org.name as vendor_name
        FROM receipts r
        LEFT JOIN organizations org ON r.vendor_id = org.id
        WHERE r.id = ?
        """,
        (receipt_id,)
    )
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_receipts_for_project(project_id: int) -> List[Dict[str, Any]]:
    """Get all receipts for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT r.*, org.name as vendor_name
        FROM receipts r
        LEFT JOIN organizations org ON r.vendor_id = org.id
        WHERE r.project_id = ?
        ORDER BY r.expense_date DESC, r.created_at DESC
        """,
        (project_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_receipt(receipt_id: int, **kwargs) -> bool:
    """Update a receipt."""
    if not kwargs:
        return False

    kwargs['updated_at'] = _get_timestamp()

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(receipt_id)

    query = f"UPDATE receipts SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_receipt(receipt_id: int) -> bool:
    """Delete a receipt (hard delete)."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM receipts WHERE id = ?", (receipt_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# WORK ORDER OPERATIONS
# =============================================================================

def create_work_order(
    project_id: int,
    title: str,
    work_order_number: Optional[str] = None,
    description: Optional[str] = None,
    budget_amount: Optional[float] = None,
    status: str = "draft",
    document_file_path: Optional[str] = None,
) -> int:
    """Create a new work order for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO work_orders (
            project_id, work_order_number, title, description, budget_amount, status, document_file_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, work_order_number, title, description, budget_amount, status, document_file_path)
    )
    wo_id = cursor.lastrowid
    conn.commit()
    conn.close()

    # Log activity
    wo_num_str = f" #{work_order_number}" if work_order_number else ""
    budget_str = f" (budget: ${budget_amount:,.2f})" if budget_amount else ""
    log_project_activity(
        project_id=project_id,
        event_type="work_order_created",
        event_subtype=status,
        description=f"Work order{wo_num_str} created: {title}{budget_str}",
        entity_type="work_order",
        entity_id=wo_id,
        amount=budget_amount,
    )

    return wo_id


def get_work_order(wo_id: int) -> Optional[Dict[str, Any]]:
    """Get a work order by ID."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM work_orders WHERE id = ?", (wo_id,))
    row = cursor.fetchone()
    conn.close()
    return _row_to_dict(row)


def get_work_orders_for_project(project_id: int) -> List[Dict[str, Any]]:
    """Get all work orders for a project."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM work_orders WHERE project_id = ? ORDER BY created_at DESC",
        (project_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


def update_work_order(wo_id: int, **kwargs) -> bool:
    """Update a work order."""
    if not kwargs:
        return False

    kwargs['updated_at'] = _get_timestamp()

    conn = get_ops_connection()
    cursor = conn.cursor()

    set_parts = [f"{key} = ?" for key in kwargs.keys()]
    values = list(kwargs.values())
    values.append(wo_id)

    query = f"UPDATE work_orders SET {', '.join(set_parts)} WHERE id = ?"
    cursor.execute(query, values)
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


def delete_work_order(wo_id: int) -> bool:
    """Delete a work order (hard delete)."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM work_orders WHERE id = ?", (wo_id,))
    conn.commit()
    affected = cursor.rowcount
    conn.close()
    return affected > 0


# =============================================================================
# ACTIVITY LOG OPERATIONS
# =============================================================================

def log_project_activity(
    project_id: int,
    event_type: str,
    description: str,
    event_subtype: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    amount: Optional[float] = None,
    actor_id: Optional[int] = None,
    metadata: Optional[str] = None,
) -> int:
    """Log an activity event for a project (renamed to avoid collision with operations.py)."""
    conn = get_ops_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO activity_log (
            project_id, event_type, event_subtype, entity_type, entity_id,
            description, old_value, new_value, amount, actor_id, metadata
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (project_id, event_type, event_subtype, entity_type, entity_id,
         description, old_value, new_value, amount, actor_id, metadata)
    )
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


def get_activity_for_project(
    project_id: int,
    event_types: Optional[List[str]] = None,
    limit: int = 50,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """Get activity log for a project with optional filtering."""
    conn = get_ops_connection()
    cursor = conn.cursor()

    query = """
        SELECT al.*, c.first_name || ' ' || c.last_name as actor_name
        FROM activity_log al
        LEFT JOIN contacts c ON al.actor_id = c.id
        WHERE al.project_id = ?
    """
    params: List[Any] = [project_id]

    if event_types:
        placeholders = ', '.join(['?' for _ in event_types])
        query += f" AND al.event_type IN ({placeholders})"
        params.extend(event_types)

    query += " ORDER BY al.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return _rows_to_list(rows)


# =============================================================================
# ACCOUNTING SUMMARY
# =============================================================================

def get_project_accounting_summary(project_id: int) -> Dict[str, Any]:
    """
    Get calculated accounting metrics for a project.

    Returns a dictionary matching AccountingSummaryResponse schema with:
    - Estimates: total_estimates, approved_estimates, pending_estimates
    - Payments: total_paid, balance_due
    - Work Orders: work_order_budget
    - Labor: total_labor_cost, total_labor_hours, billable_labor_cost, billable_labor_hours
    - Materials: total_materials_cost, total_expenses, reimbursable_expenses
    - Profitability: gross_profit, gross_profit_percentage
    - Counts: estimate_count, payment_count, labor_entry_count, receipt_count, work_order_count
    - ready_to_invoice: Boolean flag from project
    """
    conn = get_ops_connection()
    cursor = conn.cursor()

    summary: Dict[str, Any] = {
        # Estimates
        'total_estimates': 0.0,
        'approved_estimates': 0.0,
        'pending_estimates': 0.0,
        # Payments
        'total_paid': 0.0,
        'balance_due': 0.0,
        # Work Orders
        'work_order_budget': 0.0,
        # Labor
        'total_labor_cost': 0.0,
        'total_labor_hours': 0.0,
        'billable_labor_cost': 0.0,
        'billable_labor_hours': 0.0,
        # Materials/Expenses
        'total_materials_cost': 0.0,
        'total_expenses': 0.0,
        'reimbursable_expenses': 0.0,
        # Profitability
        'gross_profit': 0.0,
        'gross_profit_percentage': 0.0,
        # Counts
        'estimate_count': 0,
        'payment_count': 0,
        'labor_entry_count': 0,
        'receipt_count': 0,
        'work_order_count': 0,
        # Flags
        'ready_to_invoice': False,
    }

    # Get total estimates (sum of latest version per estimate_type)
    cursor.execute(
        """
        SELECT COALESCE(SUM(amount), 0) as total
        FROM estimates e1
        WHERE project_id = ?
        AND version = (
            SELECT MAX(version) FROM estimates e2
            WHERE e2.project_id = e1.project_id
            AND COALESCE(e2.estimate_type, '') = COALESCE(e1.estimate_type, '')
        )
        """,
        (project_id,)
    )
    row = cursor.fetchone()
    summary['total_estimates'] = row['total'] if row else 0.0

    # Get approved estimates total
    cursor.execute(
        """
        SELECT COALESCE(SUM(amount), 0) as total
        FROM estimates
        WHERE project_id = ? AND status = 'approved'
        """,
        (project_id,)
    )
    row = cursor.fetchone()
    summary['approved_estimates'] = row['total'] if row else 0.0

    # Get pending estimates total
    cursor.execute(
        """
        SELECT COALESCE(SUM(amount), 0) as total
        FROM estimates
        WHERE project_id = ? AND status IN ('draft', 'submitted')
        """,
        (project_id,)
    )
    row = cursor.fetchone()
    summary['pending_estimates'] = row['total'] if row else 0.0

    # Get estimate count
    cursor.execute(
        "SELECT COUNT(*) as count FROM estimates WHERE project_id = ?",
        (project_id,)
    )
    row = cursor.fetchone()
    summary['estimate_count'] = row['count'] if row else 0

    # Get total payments and count
    cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM payments WHERE project_id = ?",
        (project_id,)
    )
    row = cursor.fetchone()
    summary['total_paid'] = row['total'] if row else 0.0
    summary['payment_count'] = row['count'] if row else 0

    # Calculate balance due
    summary['balance_due'] = summary['approved_estimates'] - summary['total_paid']

    # Get work order budget and count
    cursor.execute(
        "SELECT COALESCE(SUM(budget_amount), 0) as total, COUNT(*) as count FROM work_orders WHERE project_id = ?",
        (project_id,)
    )
    row = cursor.fetchone()
    summary['work_order_budget'] = row['total'] if row else 0.0
    summary['work_order_count'] = row['count'] if row else 0

    # Get all labor totals and count
    cursor.execute(
        """
        SELECT
            COALESCE(SUM(hours), 0) as total_hours,
            COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0) as total_cost,
            COUNT(*) as count
        FROM labor_entries
        WHERE project_id = ?
        """,
        (project_id,)
    )
    row = cursor.fetchone()
    summary['total_labor_hours'] = row['total_hours'] if row else 0.0
    summary['total_labor_cost'] = row['total_cost'] if row else 0.0
    summary['labor_entry_count'] = row['count'] if row else 0

    # Get billable labor totals
    cursor.execute(
        """
        SELECT
            COALESCE(SUM(hours), 0) as total_hours,
            COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0) as total_cost
        FROM labor_entries
        WHERE project_id = ? AND billable = 1
        """,
        (project_id,)
    )
    row = cursor.fetchone()
    summary['billable_labor_hours'] = row['total_hours'] if row else 0.0
    summary['billable_labor_cost'] = row['total_cost'] if row else 0.0

    # Get materials/receipts totals and count
    cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM receipts WHERE project_id = ?",
        (project_id,)
    )
    row = cursor.fetchone()
    summary['total_materials_cost'] = row['total'] if row else 0.0
    summary['receipt_count'] = row['count'] if row else 0

    # Get reimbursable expenses
    cursor.execute(
        "SELECT COALESCE(SUM(amount), 0) as total FROM receipts WHERE project_id = ? AND reimbursable = 1",
        (project_id,)
    )
    row = cursor.fetchone()
    summary['reimbursable_expenses'] = row['total'] if row else 0.0

    # Calculate total expenses (labor + materials)
    summary['total_expenses'] = summary['total_labor_cost'] + summary['total_materials_cost']

    # Calculate gross profit
    summary['gross_profit'] = summary['approved_estimates'] - summary['total_expenses']

    if summary['approved_estimates'] > 0:
        summary['gross_profit_percentage'] = (summary['gross_profit'] / summary['approved_estimates']) * 100
    else:
        summary['gross_profit_percentage'] = 0.0

    # Get ready_to_invoice flag
    cursor.execute(
        "SELECT COALESCE(ready_to_invoice, 0) as ready FROM projects WHERE id = ?",
        (project_id,)
    )
    row = cursor.fetchone()
    summary['ready_to_invoice'] = bool(row['ready']) if row else False

    conn.close()
    return summary


def update_ready_to_invoice(project_id: int, ready: bool) -> bool:
    """Update the ready_to_invoice flag for a project."""
    return update_project(project_id, ready_to_invoice=1 if ready else 0)
