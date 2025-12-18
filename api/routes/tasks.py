"""
Apex Assistant - Task Management Routes

REST API endpoints for task and task list management.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from api.routes.auth import require_auth, UserResponse
from api.schemas.tasks import (
    TaskListCreate, TaskListUpdate, TaskListResponse, TaskListsResponse,
    TaskCreate, TaskUpdate, TaskResponse, TasksResponse,
)
from database.operations_dashboard import (
    get_task_lists, get_task_list, create_task_list, update_task_list, delete_task_list,
    get_tasks, get_task, create_task, update_task, delete_task,
    complete_task, add_task_to_my_day, remove_task_from_my_day,
    get_my_day_tasks, get_important_tasks, get_planned_tasks,
)
from database.schema_dashboard import init_dashboard_tables, create_default_task_lists

router = APIRouter()


# ============================================
# TASK LIST ENDPOINTS
# ============================================

@router.get("/task-lists", response_model=TaskListsResponse)
async def list_task_lists(user: UserResponse = Depends(require_auth)):
    """Get all task lists for the current user."""
    # Ensure tables exist and user has default lists
    init_dashboard_tables()
    create_default_task_lists(user.id)

    lists = get_task_lists(user.id)
    return TaskListsResponse(
        lists=[TaskListResponse(**tl) for tl in lists],
        total=len(lists)
    )


@router.post("/task-lists", response_model=TaskListResponse)
async def create_new_task_list(
    data: TaskListCreate,
    user: UserResponse = Depends(require_auth)
):
    """Create a new custom task list."""
    init_dashboard_tables()

    list_id = create_task_list(
        user_id=user.id,
        name=data.name,
        icon=data.icon,
        color=data.color,
    )
    task_list = get_task_list(list_id, user.id)
    if not task_list:
        raise HTTPException(status_code=500, detail="Failed to create task list")

    task_list["task_count"] = 0
    return TaskListResponse(**task_list)


@router.get("/task-lists/{list_id}", response_model=TaskListResponse)
async def get_task_list_detail(
    list_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Get a specific task list."""
    task_list = get_task_list(list_id, user.id)
    if not task_list:
        raise HTTPException(status_code=404, detail="Task list not found")

    task_list["task_count"] = len(get_tasks(user.id, list_id=list_id))
    return TaskListResponse(**task_list)


@router.patch("/task-lists/{list_id}", response_model=TaskListResponse)
async def update_task_list_endpoint(
    list_id: int,
    data: TaskListUpdate,
    user: UserResponse = Depends(require_auth)
):
    """Update a task list."""
    success = update_task_list(
        list_id=list_id,
        user_id=user.id,
        name=data.name,
        icon=data.icon,
        color=data.color,
        sort_order=data.sort_order,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Task list not found")

    task_list = get_task_list(list_id, user.id)
    task_list["task_count"] = len(get_tasks(user.id, list_id=list_id))
    return TaskListResponse(**task_list)


@router.delete("/task-lists/{list_id}")
async def delete_task_list_endpoint(
    list_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Delete a custom task list. System lists cannot be deleted."""
    success = delete_task_list(list_id, user.id)
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete this list (not found or is a system list)"
        )
    return {"status": "ok", "deleted": True}


# ============================================
# TASK ENDPOINTS
# ============================================

@router.get("/tasks", response_model=TasksResponse)
async def list_tasks(
    list_id: Optional[int] = Query(None, description="Filter by task list"),
    status: Optional[str] = Query(None, description="Filter by status"),
    is_my_day: Optional[bool] = Query(None, description="Filter My Day tasks"),
    is_important: Optional[bool] = Query(None, description="Filter important tasks"),
    due_date: Optional[str] = Query(None, description="Filter by due date (YYYY-MM-DD)"),
    view: Optional[str] = Query(None, description="Special view: my_day, important, planned"),
    user: UserResponse = Depends(require_auth)
):
    """Get tasks with optional filters."""
    init_dashboard_tables()

    # Handle special views
    if view == "my_day":
        tasks = get_my_day_tasks(user.id)
    elif view == "important":
        tasks = get_important_tasks(user.id)
    elif view == "planned":
        tasks = get_planned_tasks(user.id)
    else:
        tasks = get_tasks(
            user_id=user.id,
            list_id=list_id,
            status=status,
            is_my_day=is_my_day,
            is_important=is_important,
            due_date=due_date,
            include_subtasks=False,  # Don't include subtasks in list view
        )

    return TasksResponse(
        tasks=[TaskResponse(**t) for t in tasks],
        total=len(tasks)
    )


@router.post("/tasks", response_model=TaskResponse)
async def create_new_task(
    data: TaskCreate,
    user: UserResponse = Depends(require_auth)
):
    """Create a new task."""
    init_dashboard_tables()

    task_id = create_task(
        user_id=user.id,
        title=data.title,
        list_id=data.list_id,
        parent_id=data.parent_id,
        description=data.description,
        priority=data.priority,
        due_date=data.due_date,
        due_time=data.due_time,
        is_important=data.is_important,
        is_my_day=data.is_my_day,
        project_id=data.project_id,
    )

    task = get_task(task_id, user.id)
    if not task:
        raise HTTPException(status_code=500, detail="Failed to create task")

    return TaskResponse(**task)


@router.get("/tasks/{task_id}", response_model=TaskResponse)
async def get_task_detail(
    task_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Get a specific task with its subtasks."""
    task = get_task(task_id, user.id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskResponse(**task)


@router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task_endpoint(
    task_id: int,
    data: TaskUpdate,
    user: UserResponse = Depends(require_auth)
):
    """Update a task."""
    success = update_task(
        task_id=task_id,
        user_id=user.id,
        title=data.title,
        description=data.description,
        list_id=data.list_id,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
        due_time=data.due_time,
        is_important=data.is_important,
        is_my_day=data.is_my_day,
        sort_order=data.sort_order,
    )
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    task = get_task(task_id, user.id)
    return TaskResponse(**task)


@router.delete("/tasks/{task_id}")
async def delete_task_endpoint(
    task_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Delete a task and its subtasks."""
    success = delete_task(task_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"status": "ok", "deleted": True}


@router.post("/tasks/{task_id}/complete", response_model=TaskResponse)
async def complete_task_endpoint(
    task_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Mark a task as completed."""
    success = complete_task(task_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    task = get_task(task_id, user.id)
    return TaskResponse(**task)


@router.post("/tasks/{task_id}/add-to-my-day", response_model=TaskResponse)
async def add_to_my_day_endpoint(
    task_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Add a task to My Day."""
    success = add_task_to_my_day(task_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    task = get_task(task_id, user.id)
    return TaskResponse(**task)


@router.post("/tasks/{task_id}/remove-from-my-day", response_model=TaskResponse)
async def remove_from_my_day_endpoint(
    task_id: int,
    user: UserResponse = Depends(require_auth)
):
    """Remove a task from My Day."""
    success = remove_task_from_my_day(task_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")

    task = get_task(task_id, user.id)
    return TaskResponse(**task)
