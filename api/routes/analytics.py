"""
Apex Assistant - Analytics Routes

REST endpoints for dashboard analytics and metrics.
"""

from typing import Optional
from fastapi import APIRouter, Query
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from database import get_connection, get_automation_candidates

router = APIRouter()


@router.get("/analytics/overview")
async def get_overview():
    """
    Get dashboard overview metrics.

    Returns:
        - Total tasks
        - Tasks by status
        - Success rate
        - Average completion time
        - Tasks today
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Total tasks
    cursor.execute("SELECT COUNT(*) FROM tasks")
    total_tasks = cursor.fetchone()[0]

    # Tasks by status
    cursor.execute("""
        SELECT status, COUNT(*) as count
        FROM tasks
        GROUP BY status
    """)
    status_counts = {row[0]: row[1] for row in cursor.fetchall()}

    # Success rate
    completed = status_counts.get("completed", 0)
    failed = status_counts.get("failed", 0)
    success_rate = (
        completed / (completed + failed) * 100
        if (completed + failed) > 0
        else 0
    )

    # Average completion time
    cursor.execute("""
        SELECT AVG(time_to_complete)
        FROM tasks
        WHERE time_to_complete IS NOT NULL
    """)
    avg_time = cursor.fetchone()[0] or 0

    # Tasks today
    cursor.execute("""
        SELECT COUNT(*)
        FROM tasks
        WHERE date(timestamp) = date('now')
    """)
    tasks_today = cursor.fetchone()[0]

    conn.close()

    return {
        "total_tasks": total_tasks,
        "tasks_by_status": status_counts,
        "success_rate": round(success_rate, 1),
        "average_completion_time_seconds": round(avg_time, 1),
        "tasks_today": tasks_today,
    }


@router.get("/analytics/categories")
async def get_category_breakdown():
    """
    Get task breakdown by category.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            category,
            COUNT(*) as count,
            AVG(time_to_complete) as avg_time,
            AVG(complexity_score) as avg_complexity,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM tasks
        WHERE category IS NOT NULL
        GROUP BY category
        ORDER BY count DESC
    """)

    categories = []
    for row in cursor.fetchall():
        cat_completed = row[4] or 0
        cat_failed = row[5] or 0
        cat_total = cat_completed + cat_failed

        categories.append({
            "category": row[0],
            "count": row[1],
            "avg_time_seconds": round(row[2] or 0, 1),
            "avg_complexity": round(row[3] or 0, 1),
            "success_rate": round(
                cat_completed / cat_total * 100 if cat_total > 0 else 0,
                1
            ),
        })

    conn.close()

    return {"categories": categories}


@router.get("/analytics/complexity")
async def get_complexity_distribution():
    """
    Get distribution of task complexity scores.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT complexity_score, COUNT(*) as count
        FROM tasks
        WHERE complexity_score IS NOT NULL
        GROUP BY complexity_score
        ORDER BY complexity_score
    """)

    distribution = {row[0]: row[1] for row in cursor.fetchall()}

    # Ensure all scores 1-5 are represented
    for i in range(1, 6):
        if i not in distribution:
            distribution[i] = 0

    conn.close()

    return {"complexity_distribution": distribution}


@router.get("/analytics/tools")
async def get_tool_usage():
    """
    Get tool usage statistics.
    """
    import json

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT tools_used
        FROM tasks
        WHERE tools_used IS NOT NULL
    """)

    tool_counts = {}
    for row in cursor.fetchall():
        try:
            tools = json.loads(row[0])
            for tool in tools:
                tool_counts[tool] = tool_counts.get(tool, 0) + 1
        except (json.JSONDecodeError, TypeError):
            pass

    conn.close()

    # Sort by count descending
    sorted_tools = sorted(
        tool_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )

    return {
        "tools": [
            {"name": name, "count": count}
            for name, count in sorted_tools
        ]
    }


@router.get("/analytics/automation-candidates")
async def get_automation_opportunities(
    status: Optional[str] = Query(default=None),
    limit: int = Query(default=10, le=50),
):
    """
    Get automation opportunity recommendations.

    Args:
        status: Filter by status (identified, in_review, implemented, dismissed)
        limit: Maximum number of candidates to return
    """
    candidates = get_automation_candidates(status=status)

    # Sort by frequency (already done in get_automation_candidates)
    candidates = candidates[:limit]

    return {"candidates": candidates}


@router.get("/analytics/timeline")
async def get_activity_timeline(
    days: int = Query(default=30, le=90),
):
    """
    Get task activity over time.

    Args:
        days: Number of days of history to include
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT
            date(timestamp) as date,
            COUNT(*) as count,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM tasks
        WHERE timestamp >= datetime('now', '-{days} days')
        GROUP BY date(timestamp)
        ORDER BY date(timestamp)
    """)

    timeline = []
    for row in cursor.fetchall():
        timeline.append({
            "date": row[0],
            "total": row[1],
            "completed": row[2] or 0,
            "failed": row[3] or 0,
        })

    conn.close()

    return {"timeline": timeline, "days": days}


@router.get("/analytics/agents")
async def get_agent_usage():
    """
    Get agent usage statistics.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            agent_used,
            COUNT(*) as count,
            AVG(time_to_complete) as avg_time,
            AVG(complexity_score) as avg_complexity,
            AVG(quality_rating) as avg_quality
        FROM tasks
        WHERE agent_used IS NOT NULL
        GROUP BY agent_used
        ORDER BY count DESC
    """)

    agents = []
    for row in cursor.fetchall():
        agents.append({
            "agent": row[0],
            "task_count": row[1],
            "avg_time_seconds": round(row[2] or 0, 1),
            "avg_complexity": round(row[3] or 0, 1),
            "avg_quality_rating": round(row[4] or 0, 1) if row[4] else None,
        })

    conn.close()

    return {"agents": agents}
