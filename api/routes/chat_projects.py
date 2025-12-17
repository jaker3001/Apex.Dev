"""
Apex Assistant - Chat Projects Routes

REST endpoints for managing Chat Mode projects (Claude Desktop style).
"""

from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import (
    create_chat_project,
    get_chat_project,
    get_all_chat_projects,
    update_chat_project,
    delete_chat_project as db_delete_chat_project,
    log_activity,
)

router = APIRouter()


# Pydantic models for request/response
class ChatProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    instructions: Optional[str] = None
    knowledge_path: Optional[str] = None
    linked_job_number: Optional[str] = None


class ChatProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    instructions: Optional[str] = None
    knowledge_path: Optional[str] = None
    linked_job_number: Optional[str] = None


class ChatProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    instructions: Optional[str]
    knowledgePath: Optional[str]
    linkedJobNumber: Optional[str]
    createdAt: str
    updatedAt: str


def transform_project(project: dict) -> dict:
    """Transform project dict to camelCase for frontend."""
    return {
        "id": project.get("id"),
        "name": project.get("name"),
        "description": project.get("description"),
        "instructions": project.get("instructions"),
        "knowledgePath": project.get("knowledge_path"),
        "linkedJobNumber": project.get("linked_job_number"),
        "createdAt": project.get("created_at"),
        "updatedAt": project.get("updated_at"),
    }


@router.get("/chat-projects")
async def list_chat_projects():
    """List all chat projects."""
    projects = get_all_chat_projects()
    return {
        "projects": [transform_project(p) for p in projects],
        "total": len(projects),
    }


@router.get("/chat-projects/{project_id}")
async def get_chat_project_detail(project_id: int):
    """Get a specific chat project by ID."""
    project = get_chat_project(project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Chat project not found")

    return transform_project(project)


@router.post("/chat-projects")
async def create_chat_project_endpoint(data: ChatProjectCreate):
    """Create a new chat project."""
    project_id = create_chat_project(
        name=data.name,
        description=data.description,
        instructions=data.instructions,
        knowledge_path=data.knowledge_path,
        linked_job_number=data.linked_job_number,
    )

    log_activity(
        log_type="api",
        data={"action": "create_chat_project", "project_id": project_id, "name": data.name},
    )

    project = get_chat_project(project_id)
    return transform_project(project)


@router.patch("/chat-projects/{project_id}")
async def update_chat_project_endpoint(project_id: int, data: ChatProjectUpdate):
    """Update a chat project."""
    project = get_chat_project(project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Chat project not found")

    # Build update dict from non-None fields
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.instructions is not None:
        update_data["instructions"] = data.instructions
    if data.knowledge_path is not None:
        update_data["knowledge_path"] = data.knowledge_path
    if data.linked_job_number is not None:
        update_data["linked_job_number"] = data.linked_job_number

    if update_data:
        update_chat_project(project_id, **update_data)

    log_activity(
        log_type="api",
        data={"action": "update_chat_project", "project_id": project_id, "fields": list(update_data.keys())},
    )

    updated_project = get_chat_project(project_id)
    return transform_project(updated_project)


@router.delete("/chat-projects/{project_id}")
async def delete_chat_project_endpoint(project_id: int):
    """Delete a chat project."""
    project = get_chat_project(project_id)

    if not project:
        raise HTTPException(status_code=404, detail="Chat project not found")

    log_activity(
        log_type="api",
        data={"action": "delete_chat_project", "project_id": project_id, "name": project.get("name")},
        severity="warning",
    )

    db_delete_chat_project(project_id)

    return {"status": "ok", "message": f"Chat project {project_id} deleted"}
