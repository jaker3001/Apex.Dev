"""
Repository for business.work_orders table.

Manages work orders that may differ from or precede formal estimates.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.operations import WorkOrderResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.work_order")


class WorkOrderRepository(BaseRepository[WorkOrderResponse]):
    """Repository for work orders."""

    def __init__(self):
        super().__init__(
            table_name="work_orders",
            schema="business",
            model=WorkOrderResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        order_by: str = "-created_at",
    ) -> List[WorkOrderResponse]:
        """
        Find all work orders for a job.

        Args:
            job_id: Job ID
            order_by: Sort order

        Returns:
            List of work orders
        """
        return await self.find_all(
            filters={"job_id": job_id},
            order_by=order_by,
        )

    async def find_by_status(
        self,
        status: str,
        job_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[WorkOrderResponse]:
        """
        Find work orders by status.

        Args:
            status: Work order status
            job_id: Optional job filter
            limit: Max results

        Returns:
            List of work orders
        """
        filters = {"status": status}
        if job_id:
            filters["job_id"] = job_id

        return await self.find_all(
            filters=filters,
            order_by="-created_at",
            limit=limit,
        )

    async def find_by_number(self, work_order_number: str) -> Optional[WorkOrderResponse]:
        """
        Find work order by number.

        Args:
            work_order_number: Work order number

        Returns:
            Work order if found
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .eq("work_order_number", work_order_number)
                .execute()
            )

            if not result.data:
                return None

            return self.model(**result.data[0])

        except Exception as e:
            logger.error(f"Error finding work order by number: {e}")
            raise handle_supabase_error(e)

    async def sum_budget_by_job(self, job_id: int) -> float:
        """
        Get total work order budget for a job.

        Args:
            job_id: Job ID

        Returns:
            Sum of budgets
        """
        try:
            result = (
                self._get_table()
                .select("budget_amount")
                .eq("job_id", job_id)
                .neq("status", "cancelled")
                .execute()
            )

            total = sum(wo.get("budget_amount", 0) or 0 for wo in result.data)
            return total

        except Exception as e:
            logger.error(f"Error summing work order budgets for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_pending_approval(self, limit: int = 50) -> List[WorkOrderResponse]:
        """Find work orders pending approval (draft status)."""
        return await self.find_by_status("draft", limit=limit)

    async def find_in_progress(self, limit: int = 50) -> List[WorkOrderResponse]:
        """Find work orders currently in progress."""
        return await self.find_by_status("in_progress", limit=limit)

    async def get_next_number(self, job_id: int) -> str:
        """
        Generate next work order number for a job.

        Format: WO-{job_id}-{sequence}

        Args:
            job_id: Job ID

        Returns:
            Next work order number
        """
        work_orders = await self.find_by_job(job_id)
        sequence = len(work_orders) + 1
        return f"WO-{job_id}-{sequence:03d}"
