"""
Apex Assistant - Goals Routes

REST API endpoints for goal and milestone management.
Goals represent long-term objectives with trackable milestones.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List

from api.routes.auth import require_auth, UserProfile
from api.schemas.second_brain import (
    GoalStatus, GoalCreate, GoalUpdate, GoalResponse, GoalsResponse,
    MilestoneCreate, MilestoneUpdate, MilestoneResponse,
)
from api.repositories.goal_repository import GoalRepository, MilestoneRepository

router = APIRouter()


def get_goal_repo() -> GoalRepository:
    """Get goal repository instance."""
    return GoalRepository()


def get_milestone_repo() -> MilestoneRepository:
    """Get milestone repository instance."""
    return MilestoneRepository()


# ============================================
# GOAL ENDPOINTS
# ============================================

@router.get("/goals", response_model=GoalsResponse)
async def list_goals(
    status: Optional[GoalStatus] = Query(None, description="Filter by status"),
    tag_id: Optional[int] = Query(None, description="Filter by tag/area"),
    include_archived: bool = Query(False, description="Include archived goals"),
    include_milestones: bool = Query(True, description="Include milestones in response"),
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """
    Get goals with optional filters.

    Goals have three statuses:
    - `dream`: Future aspirations, not actively pursuing
    - `active`: Currently working toward
    - `achieved`: Completed goals
    """
    if status == "dream":
        goals = await repo.find_dreams(user.id, include_archived=include_archived)
    elif status == "active":
        goals = await repo.find_active(user.id, include_archived=include_archived)
    elif status == "achieved":
        goals = await repo.find_achieved(user.id, include_archived=include_archived)
    else:
        goals = await repo.find_by_user(user.id, include_archived=include_archived)

    # Filter by tag if provided
    if tag_id is not None:
        goals = [g for g in goals if g.tag_id == tag_id]

    return GoalsResponse(goals=goals, total=len(goals))


@router.post("/goals", response_model=GoalResponse)
async def create_goal(
    data: GoalCreate,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """Create a new goal."""
    goal_data = data.model_dump()
    goal_data["user_id"] = user.id

    goal = await repo.create(goal_data)
    return goal


@router.get("/goals/{goal_id}", response_model=GoalResponse)
async def get_goal(
    goal_id: int,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """Get a specific goal with its milestones."""
    goal = await repo.find_by_id(goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    return goal


@router.patch("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    data: GoalUpdate,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """Update a goal."""
    existing = await repo.find_by_id(goal_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return existing

    goal = await repo.update(goal_id, update_data)
    return goal


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: int,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """Delete a goal and its milestones."""
    existing = await repo.find_by_id(goal_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    success = await repo.delete(goal_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete goal")

    return {"status": "ok", "deleted": True}


@router.post("/goals/{goal_id}/activate", response_model=GoalResponse)
async def activate_goal(
    goal_id: int,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """
    Activate a goal.

    Moves goal from 'dream' to 'active' status.
    Sets goal_set date to current date.
    """
    existing = await repo.find_by_id(goal_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = await repo.activate(goal_id)
    return goal


@router.post("/goals/{goal_id}/achieve", response_model=GoalResponse)
async def achieve_goal(
    goal_id: int,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """
    Mark a goal as achieved.

    Sets status to 'achieved' and records achieved_at timestamp.
    """
    existing = await repo.find_by_id(goal_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = await repo.achieve(goal_id)
    return goal


@router.post("/goals/{goal_id}/archive", response_model=GoalResponse)
async def archive_goal(
    goal_id: int,
    user: UserProfile = Depends(require_auth),
    repo: GoalRepository = Depends(get_goal_repo),
):
    """Archive a goal."""
    existing = await repo.find_by_id(goal_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = await repo.update(goal_id, {"archived": True})
    return goal


# ============================================
# MILESTONE ENDPOINTS
# ============================================

@router.get("/goals/{goal_id}/milestones", response_model=List[MilestoneResponse])
async def list_milestones(
    goal_id: int,
    user: UserProfile = Depends(require_auth),
    goal_repo: GoalRepository = Depends(get_goal_repo),
    milestone_repo: MilestoneRepository = Depends(get_milestone_repo),
):
    """Get all milestones for a goal."""
    goal = await goal_repo.find_by_id(goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    milestones = await milestone_repo.find_by_goal(goal_id)
    return milestones


@router.post("/goals/{goal_id}/milestones", response_model=MilestoneResponse)
async def create_milestone(
    goal_id: int,
    data: MilestoneCreate,
    user: UserProfile = Depends(require_auth),
    goal_repo: GoalRepository = Depends(get_goal_repo),
    milestone_repo: MilestoneRepository = Depends(get_milestone_repo),
):
    """Add a milestone to a goal."""
    goal = await goal_repo.find_by_id(goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Goal not found")

    milestone_data = data.model_dump()
    milestone_data["goal_id"] = goal_id

    milestone = await milestone_repo.create(milestone_data)
    return milestone


@router.patch("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: int,
    data: MilestoneUpdate,
    user: UserProfile = Depends(require_auth),
    goal_repo: GoalRepository = Depends(get_goal_repo),
    milestone_repo: MilestoneRepository = Depends(get_milestone_repo),
):
    """Update a milestone."""
    milestone = await milestone_repo.find_by_id(milestone_id)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    # Verify goal ownership
    goal = await goal_repo.find_by_id(milestone.goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        return milestone

    updated = await milestone_repo.update(milestone_id, update_data)
    return updated


@router.post("/milestones/{milestone_id}/complete", response_model=MilestoneResponse)
async def complete_milestone(
    milestone_id: int,
    user: UserProfile = Depends(require_auth),
    goal_repo: GoalRepository = Depends(get_goal_repo),
    milestone_repo: MilestoneRepository = Depends(get_milestone_repo),
):
    """Mark a milestone as completed."""
    milestone = await milestone_repo.find_by_id(milestone_id)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal = await goal_repo.find_by_id(milestone.goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    updated = await milestone_repo.complete(milestone_id)
    return updated


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: int,
    user: UserProfile = Depends(require_auth),
    goal_repo: GoalRepository = Depends(get_goal_repo),
    milestone_repo: MilestoneRepository = Depends(get_milestone_repo),
):
    """Delete a milestone."""
    milestone = await milestone_repo.find_by_id(milestone_id)
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal = await goal_repo.find_by_id(milestone.goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404, detail="Milestone not found")

    success = await milestone_repo.delete(milestone_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete milestone")

    return {"status": "ok", "deleted": True}
