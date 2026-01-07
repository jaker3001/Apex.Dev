"""
Apex Assistant - Task API Schemas

Pydantic models for task management endpoints.
Enhanced with MS To Do-like features.
"""

from datetime import datetime, date
from typing import Optional, List, Any
from pydantic import BaseModel, Field


# ============================================
# TASK LIST SCHEMAS
# ============================================

class TaskListBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None


class TaskListCreate(TaskListBase):
    pass


class TaskListUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    icon: Optional[str] = None
    color: Optional[str] = None
    sort_order: Optional[int] = None
    show_completed: Optional[bool] = None


class TaskListResponse(TaskListBase):
    id: int
    user_id: int
    is_system: bool
    sort_order: int
    task_count: int = 0
    show_completed: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================
# RECURRENCE SCHEMAS
# ============================================

class RecurrenceConfig(BaseModel):
    """Recurrence configuration matching MS To Do."""
    interval: int = Field(ge=1, le=99)
    unit: str = Field(pattern="^(days|weeks|months|years)$")
    days: Optional[List[str]] = None  # For weekly: ["Monday", "Wednesday"]


# ============================================
# TASK SCHEMAS
# ============================================

class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None  # Brief description / notes preview
    notes: Optional[str] = None  # Detailed markdown notes
    priority: str = Field(default="none", pattern="^(none|low|medium|high)$")
    due_date: Optional[str] = None  # YYYY-MM-DD format
    due_time: Optional[str] = None  # HH:MM format
    is_important: bool = False
    is_my_day: bool = False


class TaskCreate(TaskBase):
    list_id: Optional[int] = None
    parent_id: Optional[int] = None
    project_id: Optional[int] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[RecurrenceConfig] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    notes: Optional[str] = None
    list_id: Optional[int] = None
    status: Optional[str] = Field(None, pattern="^(open|in_progress|completed|cancelled)$")
    priority: Optional[str] = Field(None, pattern="^(none|low|medium|high)$")
    due_date: Optional[str] = None
    due_time: Optional[str] = None
    is_important: Optional[bool] = None
    is_my_day: Optional[bool] = None
    sort_order: Optional[int] = None
    reminder_at: Optional[datetime] = None
    recurrence: Optional[RecurrenceConfig] = None


class TaskResponse(TaskBase):
    id: int
    user_id: int
    list_id: Optional[int] = None
    parent_id: Optional[int] = None
    status: str
    project_id: Optional[int] = None
    my_day_date: Optional[str] = None
    reminder_at: Optional[datetime] = None
    recurrence_rule: Optional[str] = None  # Serialized recurrence config
    completed_at: Optional[datetime] = None
    sort_order: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Subtask counts
    subtask_total: int = 0
    subtask_completed: int = 0
    subtasks: List["TaskResponse"] = []

    class Config:
        from_attributes = True


# ============================================
# BATCH OPERATION SCHEMAS
# ============================================

class TaskReorderItem(BaseModel):
    id: int
    sort_order: int


class TaskReorderRequest(BaseModel):
    updates: List[TaskReorderItem]


class TaskBatchMoveRequest(BaseModel):
    task_ids: List[int]
    list_id: Optional[int] = None  # None = move to default/no list


# ============================================
# LIST RESPONSE SCHEMAS
# ============================================

class TaskListsResponse(BaseModel):
    lists: List[TaskListResponse]
    total: int


class TasksResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int


class SmartListCounts(BaseModel):
    """Counts for smart lists in sidebar."""
    my_day: int = 0
    important: int = 0
    planned: int = 0
    all: int = 0


# Self-reference for subtasks
TaskResponse.model_rebuild()
