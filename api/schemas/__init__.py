"""
Apex Assistant - API Schemas

Pydantic models for request/response validation.
"""

from .chat import (
    ChatMessage,
    StreamEvent,
    ConversationResponse,
    ConversationListResponse,
)

from .operations import (
    # Organization schemas
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationListResponse,
    # Contact schemas
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactListResponse,
    # Client schemas
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    # Project schemas
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
    ProjectStatsResponse,
    ProjectFullResponse,
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
    # Project contact schemas
    ProjectContactCreate,
    ProjectContactResponse,
    ProjectContactListResponse,
)

__all__ = [
    # Chat schemas
    "ChatMessage",
    "StreamEvent",
    "ConversationResponse",
    "ConversationListResponse",
    # Organization schemas
    "OrganizationCreate",
    "OrganizationUpdate",
    "OrganizationResponse",
    "OrganizationListResponse",
    # Contact schemas
    "ContactCreate",
    "ContactUpdate",
    "ContactResponse",
    "ContactListResponse",
    # Client schemas
    "ClientCreate",
    "ClientUpdate",
    "ClientResponse",
    "ClientListResponse",
    # Project schemas
    "ProjectCreate",
    "ProjectUpdate",
    "ProjectResponse",
    "ProjectListResponse",
    "ProjectStatsResponse",
    "ProjectFullResponse",
    # Note schemas
    "NoteCreate",
    "NoteUpdate",
    "NoteResponse",
    "NoteListResponse",
    # Estimate schemas
    "EstimateCreate",
    "EstimateUpdate",
    "EstimateResponse",
    "EstimateListResponse",
    # Payment schemas
    "PaymentCreate",
    "PaymentUpdate",
    "PaymentResponse",
    "PaymentListResponse",
    # Project contact schemas
    "ProjectContactCreate",
    "ProjectContactResponse",
    "ProjectContactListResponse",
]
