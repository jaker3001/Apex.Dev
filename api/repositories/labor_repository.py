"""
Repository for business.labor_entries table.

Manages per-employee hours tracking.
"""
from typing import List, Optional, Dict, Any
from datetime import date
from api.repositories.base import BaseRepository
from api.schemas.operations import LaborEntryResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.labor")


class LaborRepository(BaseRepository[LaborEntryResponse]):
    """Repository for labor entries."""

    def __init__(self):
        super().__init__(
            table_name="labor_entries",
            schema="business",
            model=LaborEntryResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        order_by: str = "-work_date",
    ) -> List[LaborEntryResponse]:
        """
        Find all labor entries for a job.

        Args:
            job_id: Job ID
            order_by: Sort order

        Returns:
            List of labor entries
        """
        return await self.find_all(
            filters={"job_id": job_id},
            order_by=order_by,
        )

    async def find_by_employee(
        self,
        employee_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[LaborEntryResponse]:
        """
        Find all labor entries for an employee.

        Args:
            employee_id: Employee contact ID
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            List of labor entries
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("employee_id", employee_id)
            )

            if start_date:
                query = query.gte("work_date", start_date)
            if end_date:
                query = query.lte("work_date", end_date)

            result = query.order("work_date", desc=True).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding labor entries for employee {employee_id}: {e}")
            raise handle_supabase_error(e)

    async def sum_hours_by_job(
        self,
        job_id: int,
        billable_only: bool = False,
    ) -> float:
        """
        Get total hours for a job.

        Args:
            job_id: Job ID
            billable_only: Only count billable hours

        Returns:
            Total hours
        """
        try:
            query = (
                self._get_table()
                .select("hours")
                .eq("job_id", job_id)
            )

            if billable_only:
                query = query.eq("billable", True)

            result = query.execute()

            total = sum(e.get("hours", 0) or 0 for e in result.data)
            return total

        except Exception as e:
            logger.error(f"Error summing hours for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def sum_cost_by_job(
        self,
        job_id: int,
        billable_only: bool = False,
    ) -> float:
        """
        Get total labor cost for a job.

        Args:
            job_id: Job ID
            billable_only: Only count billable labor

        Returns:
            Total labor cost
        """
        try:
            query = (
                self._get_table()
                .select("hours, hourly_rate")
                .eq("job_id", job_id)
            )

            if billable_only:
                query = query.eq("billable", True)

            result = query.execute()

            total = sum(
                (e.get("hours", 0) or 0) * (e.get("hourly_rate", 0) or 0)
                for e in result.data
            )
            return total

        except Exception as e:
            logger.error(f"Error summing labor cost for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_by_date_range(
        self,
        start_date: str,
        end_date: str,
        job_id: Optional[int] = None,
    ) -> List[LaborEntryResponse]:
        """
        Find labor entries within a date range.

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            job_id: Optional job filter

        Returns:
            List of labor entries
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .gte("work_date", start_date)
                .lte("work_date", end_date)
            )

            if job_id:
                query = query.eq("job_id", job_id)

            result = query.order("work_date", desc=True).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding labor entries by date range: {e}")
            raise handle_supabase_error(e)

    async def find_by_category(
        self,
        job_id: int,
        category: str,
    ) -> List[LaborEntryResponse]:
        """
        Find labor entries by work category.

        Args:
            job_id: Job ID
            category: Work category

        Returns:
            List of labor entries
        """
        return await self.find_all(
            filters={"job_id": job_id, "work_category": category},
            order_by="-work_date",
        )
