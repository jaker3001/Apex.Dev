"""
Apex Assistant - Agent Routes

REST endpoints for managing agents.
"""

from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import (
    register_agent,
    get_agent,
    get_all_agents,
    update_agent_usage,
    get_connection,
)

router = APIRouter()


class AgentCreate(BaseModel):
    """Schema for creating a new agent."""
    name: str
    description: str
    capabilities: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    allowed_tools: Optional[List[str]] = None


class AgentUpdate(BaseModel):
    """Schema for updating an agent."""
    description: Optional[str] = None
    capabilities: Optional[List[str]] = None
    system_prompt: Optional[str] = None
    allowed_tools: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.get("/agents")
async def list_agents(
    active_only: bool = Query(default=True),
):
    """
    List all registered agents.

    Args:
        active_only: If true, only return active agents
    """
    agents = get_all_agents(active_only=active_only)
    return {"agents": agents}


@router.get("/agents/{agent_name}")
async def get_agent_detail(agent_name: str):
    """
    Get a specific agent by name.
    """
    agent = get_agent(agent_name)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return agent


@router.post("/agents")
async def create_agent(agent: AgentCreate):
    """
    Register a new agent.
    """
    # Check if agent already exists
    existing = get_agent(agent.name)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Agent '{agent.name}' already exists"
        )

    agent_id = register_agent(
        name=agent.name,
        description=agent.description,
        capabilities=agent.capabilities,
    )

    # Store additional fields (system_prompt, allowed_tools) if provided
    # TODO: Extend schema to support these fields

    return {
        "id": agent_id,
        "name": agent.name,
        "message": "Agent created successfully",
    }


@router.put("/agents/{agent_name}")
async def update_agent(agent_name: str, update: AgentUpdate):
    """
    Update an existing agent.
    """
    agent = get_agent(agent_name)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    conn = get_connection()
    cursor = conn.cursor()

    updates = []
    params = []

    if update.description is not None:
        updates.append("description = ?")
        params.append(update.description)

    if update.capabilities is not None:
        import json
        updates.append("capabilities = ?")
        params.append(json.dumps(update.capabilities))

    if update.is_active is not None:
        updates.append("is_active = ?")
        params.append(1 if update.is_active else 0)

    if updates:
        params.append(agent_name)
        cursor.execute(
            f"UPDATE agents SET {', '.join(updates)} WHERE name = ?",
            params
        )
        conn.commit()

    conn.close()

    return {"message": "Agent updated successfully"}


@router.delete("/agents/{agent_name}")
async def delete_agent(agent_name: str):
    """
    Deactivate an agent (soft delete).
    """
    agent = get_agent(agent_name)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE agents SET is_active = 0 WHERE name = ?",
        (agent_name,)
    )
    conn.commit()
    conn.close()

    return {"message": "Agent deactivated successfully"}


@router.post("/agents/{agent_name}/test")
async def test_agent(agent_name: str, test_input: dict):
    """
    Test an agent with sample input.

    TODO: Implement agent testing functionality.
    """
    agent = get_agent(agent_name)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return {
        "message": "Agent testing not yet implemented",
        "agent": agent_name,
        "input": test_input,
    }
