"""
Apex Assistant - Metrics Collection

Utilities for collecting and analyzing task metrics to identify automation opportunities.
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime
import time


@dataclass
class TaskMetrics:
    """
    Collects metrics for a single task to help determine automation potential.

    Usage:
        metrics = TaskMetrics()
        metrics.start()
        # ... task execution ...
        metrics.add_step("Read the estimate file")
        metrics.add_decision_point("Determine if line item is justified")
        metrics.record_tool("Read")
        # ... more execution ...
        metrics.complete(success=True)
    """

    # Timing
    start_time: Optional[float] = None
    end_time: Optional[float] = None

    # Complexity indicators
    steps: list[str] = field(default_factory=list)
    decision_points: list[str] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)

    # Classification
    complexity_score: Optional[int] = None  # 1-5
    context_needed: Optional[Literal["low", "medium", "high"]] = None
    reusability: Optional[Literal["low", "medium", "high"]] = None
    input_type: Optional[Literal["text", "file", "image", "structured_data", "multiple"]] = None
    output_type: Optional[str] = None

    # Quality indicators
    human_corrections: int = 0
    follow_up_tasks: int = 0
    quality_rating: Optional[int] = None  # 1-5 (user-provided)

    # Pattern matching
    frequency_tag: Optional[str] = None

    def start(self) -> None:
        """Mark the start of task execution."""
        self.start_time = time.time()

    def complete(self, success: bool = True) -> None:
        """Mark the end of task execution."""
        self.end_time = time.time()
        self._calculate_complexity()

    def add_step(self, description: str) -> None:
        """Record a step in the task execution."""
        self.steps.append(description)

    def add_decision_point(self, description: str) -> None:
        """Record a decision point requiring judgment."""
        self.decision_points.append(description)

    def record_tool(self, tool_name: str) -> None:
        """Record a tool being used."""
        if tool_name not in self.tools_used:
            self.tools_used.append(tool_name)

    def record_correction(self) -> None:
        """Record a human correction/intervention."""
        self.human_corrections += 1

    def record_follow_up(self) -> None:
        """Record a follow-up task spawned from this one."""
        self.follow_up_tasks += 1

    def _calculate_complexity(self) -> None:
        """Auto-calculate complexity score based on metrics."""
        score = 1

        # Steps add complexity
        if len(self.steps) > 5:
            score += 2
        elif len(self.steps) > 2:
            score += 1

        # Decision points add significant complexity
        if len(self.decision_points) > 3:
            score += 2
        elif len(self.decision_points) > 0:
            score += 1

        # Tools used
        if len(self.tools_used) > 3:
            score += 1

        self.complexity_score = min(score, 5)

    @property
    def time_to_complete(self) -> Optional[int]:
        """Get task duration in seconds."""
        if self.start_time and self.end_time:
            return int(self.end_time - self.start_time)
        return None

    @property
    def steps_required(self) -> int:
        """Get number of steps."""
        return len(self.steps)

    @property
    def decision_point_count(self) -> int:
        """Get number of decision points."""
        return len(self.decision_points)

    def to_dict(self) -> dict:
        """Convert to dictionary for database storage."""
        return {
            "complexity_score": self.complexity_score,
            "steps_required": self.steps_required,
            "decision_points": self.decision_point_count,
            "context_needed": self.context_needed,
            "reusability": self.reusability,
            "input_type": self.input_type,
            "output_type": self.output_type,
            "tools_used": self.tools_used,
            "human_corrections": self.human_corrections,
            "follow_up_tasks": self.follow_up_tasks,
            "time_to_complete": self.time_to_complete,
            "quality_rating": self.quality_rating,
            "frequency_tag": self.frequency_tag,
        }


def classify_automation_type(metrics: TaskMetrics) -> Literal["skill", "sub-agent", "combo"]:
    """
    Classify what type of automation would be appropriate for a task.

    Based on the classification logic from requirements:

    SKILL - High reusability, low complexity, single step, minimal judgment
    SUB-AGENT - Requires judgment, multi-step, context awareness, domain expertise
    COMBO - Specialized agent that leverages specific skills

    Args:
        metrics: Collected task metrics

    Returns:
        Automation type recommendation
    """
    complexity = metrics.complexity_score or 3
    steps = metrics.steps_required
    decisions = metrics.decision_point_count
    reusability = metrics.reusability or "medium"

    # SKILL criteria: simple, repeatable, minimal judgment
    if (
        complexity <= 2
        and steps <= 2
        and decisions <= 1
        and reusability in ("medium", "high")
    ):
        return "skill"

    # COMBO criteria: complex workflow with multiple tools
    if len(metrics.tools_used) >= 3 and complexity >= 3:
        return "combo"

    # SUB-AGENT: everything else (requires judgment, multi-step, context)
    return "sub-agent"
