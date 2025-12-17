"""
API routes for contacts and organizations.
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database.operations_apex import (
    get_all_contacts,
    get_contact,
    create_contact,
    search_contacts,
    get_organizations,
)

router = APIRouter()


# =============================================================================
# SCHEMAS
# =============================================================================

class ContactCreate(BaseModel):
    first_name: str
    last_name: str
    organization_id: Optional[int] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None


class ContactResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    full_name: Optional[str] = None
    organization_id: Optional[int] = None
    organization_name: Optional[str] = None
    role: Optional[str] = None
    phone: Optional[str] = None
    phone_extension: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None

    class Config:
        extra = "allow"


class ContactListResponse(BaseModel):
    contacts: List[ContactResponse]
    total: int


class OrganizationResponse(BaseModel):
    id: int
    name: str
    org_type: str
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    has_msa: Optional[bool] = False
    msa_signed_date: Optional[str] = None
    msa_expiration_date: Optional[str] = None
    trade_category: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[int] = 1
    created_at: Optional[str] = None

    class Config:
        extra = "allow"


class OrganizationListResponse(BaseModel):
    organizations: List[OrganizationResponse]
    total: int


# =============================================================================
# CONTACT ENDPOINTS
# =============================================================================

@router.get("/contacts", response_model=ContactListResponse)
async def list_contacts(
    search: Optional[str] = None,
    limit: int = 500
):
    """
    List all contacts, optionally filtered by search query.
    """
    if search:
        contacts = search_contacts(search, limit)
    else:
        contacts = get_all_contacts(limit)

    return {
        "contacts": contacts,
        "total": len(contacts)
    }


@router.get("/contacts/{contact_id}", response_model=ContactResponse)
async def get_contact_detail(contact_id: int):
    """
    Get a single contact by ID.
    """
    contact = get_contact(contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    return contact


@router.post("/contacts", response_model=ContactResponse)
async def create_new_contact(contact: ContactCreate):
    """
    Create a new contact.
    """
    contact_id = create_contact(
        first_name=contact.first_name,
        last_name=contact.last_name,
        organization_id=contact.organization_id,
        role=contact.role,
        phone=contact.phone,
        phone_extension=contact.phone_extension,
        email=contact.email,
        notes=contact.notes,
    )

    # Fetch and return the created contact
    created = get_contact(contact_id)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create contact")
    return created


# =============================================================================
# ORGANIZATION ENDPOINTS
# =============================================================================

@router.get("/organizations", response_model=OrganizationListResponse)
async def list_organizations(
    org_type: Optional[str] = None,
    limit: int = 500
):
    """
    List all organizations, optionally filtered by type.
    """
    organizations = get_organizations(org_type=org_type, limit=limit)

    return {
        "organizations": organizations,
        "total": len(organizations)
    }
