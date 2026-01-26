"""
Apex Assistant - Second Brain API Schemas

Pydantic models for the Ultimate Brain-inspired personal productivity system:
- Tags (PARA: Areas, Resources, Entities)
- Goals and Milestones
- Personal Projects
- People (Personal Contacts)
- Notes (Full types with linking)
- Inbox Items
"""

from datetime import datetime, date
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


# ============================================
# TAG SCHEMAS (PARA System)
# ============================================

TagType = Literal["area", "resource", "entity"]


class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    type: TagType


class TagCreate(TagBase):
    parent_tag_id: Optional[int] = None
    is_favorite: bool = False


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    type: Optional[TagType] = None
    parent_tag_id: Optional[int] = None
    is_favorite: Optional[bool] = None
    sort_order: Optional[int] = None
    archived: Optional[bool] = None


class TagResponse(TagBase):
    id: int
    user_id: str
    parent_tag_id: Optional[int] = None
    is_favorite: bool = False
    sort_order: int = 0
    archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # For hierarchical display
    children: List["TagResponse"] = []

    class Config:
        from_attributes = True


class TagsResponse(BaseModel):
    tags: List[TagResponse]
    total: int


# ============================================
# GOAL SCHEMAS
# ============================================

GoalStatus = Literal["dream", "active", "achieved"]


class GoalBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class GoalCreate(GoalBase):
    status: GoalStatus = "dream"
    goal_set: Optional[str] = None  # YYYY-MM-DD
    target_date: Optional[str] = None
    tag_id: Optional[int] = None


class GoalUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    status: Optional[GoalStatus] = None
    goal_set: Optional[str] = None
    target_date: Optional[str] = None
    tag_id: Optional[int] = None
    archived: Optional[bool] = None


class GoalResponse(GoalBase):
    id: int
    user_id: str
    status: GoalStatus
    goal_set: Optional[str] = None
    target_date: Optional[str] = None
    achieved_at: Optional[datetime] = None
    tag_id: Optional[int] = None
    archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Related data
    milestones: List["MilestoneResponse"] = []
    projects: List["ProjectSummaryResponse"] = []

    class Config:
        from_attributes = True


class GoalsResponse(BaseModel):
    goals: List[GoalResponse]
    total: int


# ============================================
# MILESTONE SCHEMAS
# ============================================

class MilestoneBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    target_date: Optional[str] = None  # YYYY-MM-DD


class MilestoneCreate(MilestoneBase):
    goal_id: int


class MilestoneUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    target_date: Optional[str] = None
    completed_at: Optional[datetime] = None
    sort_order: Optional[int] = None


class MilestoneResponse(MilestoneBase):
    id: int
    goal_id: int
    completed_at: Optional[datetime] = None
    sort_order: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# PERSONAL PROJECT SCHEMAS
# ============================================

ProjectStatus = Literal["planned", "doing", "ongoing", "on_hold", "done"]
ProjectPriority = Literal["low", "medium", "high"]
AccountingMode = Literal["simple", "advanced"]


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    vision: Optional[str] = None
    desired_outcome: Optional[str] = None


class ProjectCreate(ProjectBase):
    status: ProjectStatus = "planned"
    priority: ProjectPriority = "medium"
    start_date: Optional[str] = None  # YYYY-MM-DD
    target_date: Optional[str] = None
    area_id: Optional[int] = None
    goal_id: Optional[int] = None
    accounting_mode: AccountingMode = "simple"
    budget: Optional[float] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    vision: Optional[str] = None
    desired_outcome: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[ProjectPriority] = None
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    area_id: Optional[int] = None
    goal_id: Optional[int] = None
    accounting_mode: Optional[AccountingMode] = None
    budget: Optional[float] = None
    total_spent: Optional[float] = None
    total_income: Optional[float] = None
    cover_image: Optional[str] = None
    sort_order: Optional[int] = None
    archived: Optional[bool] = None


class ProjectSummaryResponse(BaseModel):
    """Lightweight project response for lists and references."""
    id: int
    name: str
    status: ProjectStatus
    priority: ProjectPriority
    icon: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectResponse(ProjectBase):
    id: int
    user_id: str
    status: ProjectStatus
    priority: ProjectPriority
    start_date: Optional[str] = None
    target_date: Optional[str] = None
    completed_at: Optional[datetime] = None
    area_id: Optional[int] = None
    goal_id: Optional[int] = None
    accounting_mode: AccountingMode = "simple"
    budget: Optional[float] = None
    total_spent: float = 0
    total_income: float = 0
    cover_image: Optional[str] = None
    sort_order: int = 0
    archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Related data
    area: Optional[TagResponse] = None
    goal: Optional["GoalSummaryResponse"] = None
    task_count: int = 0
    completed_task_count: int = 0
    note_count: int = 0

    class Config:
        from_attributes = True


class GoalSummaryResponse(BaseModel):
    """Lightweight goal response for references."""
    id: int
    name: str
    status: GoalStatus
    icon: Optional[str] = None
    color: Optional[str] = None


class ProjectsResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int


# ============================================
# PEOPLE SCHEMAS (Personal Contacts)
# ============================================

class PersonBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None


class PersonCreate(PersonBase):
    website: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    birthday: Optional[str] = None  # YYYY-MM-DD
    relationship: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    notes: Optional[str] = None
    is_favorite: bool = False


class PersonUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    title: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    birthday: Optional[str] = None
    relationship: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    last_check_in: Optional[str] = None
    next_check_in: Optional[str] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    is_favorite: Optional[bool] = None
    archived: Optional[bool] = None


class PersonResponse(PersonBase):
    id: int
    user_id: str
    website: Optional[str] = None
    linkedin: Optional[str] = None
    twitter: Optional[str] = None
    birthday: Optional[str] = None
    relationship: Optional[List[str]] = None
    interests: Optional[List[str]] = None
    last_check_in: Optional[str] = None
    next_check_in: Optional[str] = None
    notes: Optional[str] = None
    avatar_url: Optional[str] = None
    is_favorite: bool = False
    archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Related data
    tags: List[TagResponse] = []

    class Config:
        from_attributes = True


class PeopleResponse(BaseModel):
    people: List[PersonResponse]
    total: int


# ============================================
# NOTE SCHEMAS (Full Ultimate Brain Types)
# ============================================

NoteType = Literal[
    "note", "journal", "meeting", "web_clip", "idea",
    "reference", "voice_note", "book", "lecture", "plan", "recipe"
]

LinkableType = Literal["task", "event", "project", "job", "person"]


class NoteBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: Optional[str] = None
    type: NoteType = "note"


class NoteCreate(NoteBase):
    source_url: Optional[str] = None  # For web_clip
    audio_url: Optional[str] = None  # For voice_note
    duration_seconds: Optional[int] = None
    meeting_date: Optional[datetime] = None  # For meeting
    attendees: Optional[List[str]] = None
    project_id: Optional[int] = None
    is_favorite: bool = False
    is_pinned: bool = False
    # Links to create
    tag_ids: Optional[List[int]] = None
    linked_task_ids: Optional[List[int]] = None
    linked_person_ids: Optional[List[int]] = None


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    type: Optional[NoteType] = None
    source_url: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    meeting_date: Optional[datetime] = None
    attendees: Optional[List[str]] = None
    project_id: Optional[int] = None
    is_favorite: Optional[bool] = None
    is_pinned: Optional[bool] = None
    archived: Optional[bool] = None


class NoteLinkResponse(BaseModel):
    id: int
    note_id: int
    linkable_type: LinkableType
    linkable_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NoteMediaResponse(BaseModel):
    id: int
    note_id: int
    file_name: str
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    caption: Optional[str] = None
    sort_order: int = 0
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NoteResponse(NoteBase):
    id: int
    user_id: str
    source_url: Optional[str] = None
    audio_url: Optional[str] = None
    duration_seconds: Optional[int] = None
    meeting_date: Optional[datetime] = None
    attendees: Optional[List[str]] = None
    is_favorite: bool = False
    is_pinned: bool = False
    project_id: Optional[int] = None
    word_count: int = 0
    archived: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Related data
    tags: List[TagResponse] = []
    links: List[NoteLinkResponse] = []
    media: List[NoteMediaResponse] = []
    project: Optional[ProjectSummaryResponse] = None

    class Config:
        from_attributes = True


class NotesResponse(BaseModel):
    notes: List[NoteResponse]
    total: int


# ============================================
# INBOX SCHEMAS (GTD Quick Capture)
# ============================================

InboxSource = Literal["manual", "voice", "email", "chrome_extension"]
ConvertedToType = Literal["task", "note", "project", "event"]


class InboxItemBase(BaseModel):
    content: str = Field(..., min_length=1)


class InboxItemCreate(InboxItemBase):
    source: InboxSource = "manual"
    source_url: Optional[str] = None


class InboxItemUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1)
    processed: Optional[bool] = None
    converted_to_type: Optional[ConvertedToType] = None
    converted_to_id: Optional[int] = None


class InboxItemResponse(InboxItemBase):
    id: int
    user_id: str
    source: InboxSource
    source_url: Optional[str] = None
    processed: bool = False
    processed_at: Optional[datetime] = None
    converted_to_type: Optional[ConvertedToType] = None
    converted_to_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InboxResponse(BaseModel):
    items: List[InboxItemResponse]
    total: int
    unprocessed_count: int


# Self-references for nested types
TagResponse.model_rebuild()
GoalResponse.model_rebuild()
