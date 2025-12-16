"""
Apex Assistant - Skill Routes

REST endpoints for managing skills.
"""

from typing import Optional, List
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import get_connection

router = APIRouter()


class SkillCreate(BaseModel):
    """Schema for creating a new skill."""
    name: str
    description: str
    input_type: Optional[str] = "text"  # text, file, structured_data, multiple
    output_type: Optional[str] = "text"
    instructions: Optional[str] = None
    tools_allowed: Optional[List[str]] = None


class SkillUpdate(BaseModel):
    """Schema for updating a skill."""
    description: Optional[str] = None
    input_type: Optional[str] = None
    output_type: Optional[str] = None
    instructions: Optional[str] = None
    tools_allowed: Optional[List[str]] = None


# Skill templates for quick creation
SKILL_TEMPLATES = [
    {
        "id": "pdf-extractor",
        "name": "PDF Extractor",
        "description": "Extract text and data from PDF documents",
        "input_type": "file",
        "output_type": "structured_data",
        "instructions": "Extract all text content from the provided PDF file and return it in a structured format.",
        "tools_allowed": ["Read"],
    },
    {
        "id": "email-drafter",
        "name": "Email Drafter",
        "description": "Draft professional emails based on context",
        "input_type": "text",
        "output_type": "text",
        "instructions": "Draft a professional email based on the provided context and requirements.",
        "tools_allowed": [],
    },
    {
        "id": "line-item-lookup",
        "name": "Line Item Lookup",
        "description": "Look up standard pricing for restoration line items",
        "input_type": "text",
        "output_type": "structured_data",
        "instructions": "Look up the standard pricing and description for the provided line item code.",
        "tools_allowed": ["WebSearch"],
    },
    {
        "id": "web-research",
        "name": "Web Research",
        "description": "Research information from the web",
        "input_type": "text",
        "output_type": "text",
        "instructions": "Search the web for information related to the query and summarize findings.",
        "tools_allowed": ["WebSearch", "WebFetch"],
    },
]


@router.get("/skills")
async def list_skills():
    """
    List all skills.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Check if skills table exists
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='skills'"
    )
    if not cursor.fetchone():
        conn.close()
        return {"skills": [], "message": "Skills table not yet created"}

    cursor.execute("SELECT * FROM skills ORDER BY name")
    rows = cursor.fetchall()
    conn.close()

    skills = [dict(row) for row in rows]
    return {"skills": skills}


@router.get("/skills/templates")
async def get_skill_templates():
    """
    Get available skill templates for quick creation.
    """
    return {"templates": SKILL_TEMPLATES}


@router.get("/skills/{skill_id}")
async def get_skill(skill_id: int):
    """
    Get a specific skill by ID.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM skills WHERE id = ?", (skill_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Skill not found")

    return dict(row)


@router.post("/skills")
async def create_skill(skill: SkillCreate):
    """
    Create a new skill.
    """
    import json

    conn = get_connection()
    cursor = conn.cursor()

    # Check if skills table exists, create if not
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS skills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            input_type TEXT DEFAULT 'text',
            output_type TEXT DEFAULT 'text',
            instructions TEXT,
            tools_allowed TEXT,
            created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            times_used INTEGER DEFAULT 0
        )
    """)

    # Check for duplicate name
    cursor.execute("SELECT id FROM skills WHERE name = ?", (skill.name,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"Skill '{skill.name}' already exists"
        )

    tools_json = json.dumps(skill.tools_allowed) if skill.tools_allowed else None

    cursor.execute("""
        INSERT INTO skills (name, description, input_type, output_type, instructions, tools_allowed)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        skill.name,
        skill.description,
        skill.input_type,
        skill.output_type,
        skill.instructions,
        tools_json,
    ))

    skill_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "id": skill_id,
        "name": skill.name,
        "message": "Skill created successfully",
    }


@router.post("/skills/from-template/{template_id}")
async def create_skill_from_template(template_id: str, name: Optional[str] = None):
    """
    Create a skill from a template.
    """
    template = next(
        (t for t in SKILL_TEMPLATES if t["id"] == template_id),
        None
    )

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    skill = SkillCreate(
        name=name or template["name"],
        description=template["description"],
        input_type=template["input_type"],
        output_type=template["output_type"],
        instructions=template["instructions"],
        tools_allowed=template["tools_allowed"],
    )

    return await create_skill(skill)


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: int, update: SkillUpdate):
    """
    Update an existing skill.
    """
    import json

    conn = get_connection()
    cursor = conn.cursor()

    # Check skill exists
    cursor.execute("SELECT id FROM skills WHERE id = ?", (skill_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Skill not found")

    updates = []
    params = []

    if update.description is not None:
        updates.append("description = ?")
        params.append(update.description)

    if update.input_type is not None:
        updates.append("input_type = ?")
        params.append(update.input_type)

    if update.output_type is not None:
        updates.append("output_type = ?")
        params.append(update.output_type)

    if update.instructions is not None:
        updates.append("instructions = ?")
        params.append(update.instructions)

    if update.tools_allowed is not None:
        updates.append("tools_allowed = ?")
        params.append(json.dumps(update.tools_allowed))

    if updates:
        params.append(skill_id)
        cursor.execute(
            f"UPDATE skills SET {', '.join(updates)} WHERE id = ?",
            params
        )
        conn.commit()

    conn.close()

    return {"message": "Skill updated successfully"}


@router.delete("/skills/{skill_id}")
async def delete_skill(skill_id: int):
    """
    Delete a skill.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM skills WHERE id = ?", (skill_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Skill not found")

    cursor.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
    conn.commit()
    conn.close()

    return {"message": "Skill deleted successfully"}


@router.post("/skills/{skill_id}/test")
async def test_skill(skill_id: int, test_input: dict):
    """
    Test a skill with sample input.

    TODO: Implement skill testing functionality.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM skills WHERE id = ?", (skill_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Skill not found")

    return {
        "message": "Skill testing not yet implemented",
        "skill": dict(row),
        "input": test_input,
    }
