"""
Apex Assistant - Personal Projects Routes

REST API endpoints for personal project management.
These are personal productivity projects (not restoration jobs).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from api.routes.auth import require_auth, UserProfile
from api.schemas.second_brain import (
    ProjectStatus, ProjectPriority,
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectsResponse,
)
from api.repositories.personal_project_repository import PersonalProjectRepository

router = APIRouter()


def get_project_repo() -> PersonalProjectRepository:
    """Get personal project repository instance."""
    return PersonalProjectRepository()


# ============================================
# PERSONAL PROJECT ENDPOINTS
# ============================================

@router.get("/personal-projects", response_model=ProjectsResponse)
async def list_personal_projects(
    status: Optional[ProjectStatus] = Query(None, description="Filter by status"),
    priority: Optional[ProjectPriority] = Query(None, description="Filter by priority"),
    area_id: Optional[int] = Query(None, description="Filter by area tag"),
    goal_id: Optional[int] = Query(None, description="Filter by goal"),
    include_archived: bool = Query(False, description="Include archived projects"),
    include_details: bool = Query(False, description="Include related area/goal details"),
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """
    Get personal projects with optional filters.

    Project statuses:
    - `planned`: Not started yet
    - `doing`: Actively working on
    - `ongoing`: Recurring/continuous project
    - `on_hold`: Paused temporarily
    - `done`: Completed
    """
    if include_details:
        projects = await repo.find_with_details(
            user.id,
            include_archived=include_archived,
        )
    elif area_id:
        projects = await repo.find_by_area(
            user.id, area_id,
            include_archived=include_archived,
        )
    elif goal_id:
        projects = await repo.find_by_goal(
            user.id, goal_id,
            include_archived=include_archived,
        )
    else:
        projects = await repo.find_by_user(
            user.id,
            include_archived=include_archived,
        )

    # Apply status filter
    if status:
        projects = [p for p in projects if p.status == status]

    # Apply priority filter
    if priority:
        projects = [p for p in projects if p.priority == priority]

    return ProjectsResponse(projects=projects, total=len(projects))


@router.post("/personal-projects", response_model=ProjectResponse)
async def create_personal_project(
    data: ProjectCreate,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """
    Create a new personal project.

    Projects can be linked to:
    - An area (tag of type 'area') for organization
    - A goal for tracking what the project contributes to
    """
    project_data = data.model_dump()
    project_data["user_id"] = user.id

    project = await repo.create(project_data)
    return project


@router.get("/personal-projects/{project_id}", response_model=ProjectResponse)
async def get_personal_project(
    project_id: int,
    include_details: bool = Query(True, description="Include area, goal, and counts"),
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """Get a specific personal project."""
    if include_details:
        project = await repo.find_by_id_with_details(project_id)
    else:
        project = await repo.find_by_id(project_id)

    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    return project


@router.patch("/personal-projects/{project_id}", response_model=ProjectResponse)
async def update_personal_project(
    project_id: int,
    data: ProjectUpdate,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """Update a personal project."""
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return existing

    project = await repo.update(project_id, update_data)
    return project


@router.delete("/personal-projects/{project_id}")
async def delete_personal_project(
    project_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """
    Delete a personal project.

    This does NOT delete associated tasks or notes.
    They will become unlinked from this project.
    """
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    success = await repo.delete(project_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete project")

    return {"status": "ok", "deleted": True}


@router.post("/personal-projects/{project_id}/complete", response_model=ProjectResponse)
async def complete_project(
    project_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """
    Mark a project as completed.

    Sets status to 'done' and records completed_at timestamp.
    """
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    project = await repo.complete(project_id)
    return project


@router.post("/personal-projects/{project_id}/reopen", response_model=ProjectResponse)
async def reopen_project(
    project_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """
    Reopen a completed project.

    Sets status back to 'doing' and clears completed_at.
    """
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    project = await repo.update(project_id, {
        "status": "doing",
        "completed_at": None,
    })
    return project


@router.post("/personal-projects/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """Archive a project."""
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    project = await repo.update(project_id, {"archived": True})
    return project


@router.post("/personal-projects/{project_id}/unarchive", response_model=ProjectResponse)
async def unarchive_project(
    project_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """Unarchive a project."""
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    project = await repo.update(project_id, {"archived": False})
    return project


# ============================================
# PROJECT SUMMARY ENDPOINTS
# ============================================

@router.get("/personal-projects/{project_id}/summary")
async def get_project_summary(
    project_id: int,
    user: UserProfile = Depends(require_auth),
    repo: PersonalProjectRepository = Depends(get_project_repo),
):
    """
    Get project summary with task and note counts.

    Useful for dashboard widgets and overview displays.
    """
    existing = await repo.find_by_id(project_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    project = await repo.find_by_id_with_details(project_id)

    return {
        "id": project.id,
        "name": project.name,
        "status": project.status,
        "priority": project.priority,
        "progress": {
            "total_tasks": project.task_count,
            "completed_tasks": project.completed_task_count,
            "completion_percentage": (
                round(project.completed_task_count / project.task_count * 100)
                if project.task_count > 0 else 0
            ),
        },
        "notes_count": project.note_count,
        "financials": {
            "accounting_mode": project.accounting_mode,
            "budget": project.budget,
            "spent": project.total_spent,
            "income": project.total_income,
            "net": project.total_income - project.total_spent,
        } if project.accounting_mode == "advanced" else None,
        "dates": {
            "start_date": project.start_date,
            "target_date": project.target_date,
            "completed_at": project.completed_at,
        },
    }
