"""
Repository for business.payments table.

Manages payment tracking for jobs.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.operations import PaymentResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.payment")


class PaymentRepository(BaseRepository[PaymentResponse]):
    """Repository for job payments."""

    def __init__(self):
        super().__init__(
            table_name="payments",
            schema="business",
            model=PaymentResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        order_by: str = "-received_date",
    ) -> List[PaymentResponse]:
        """
        Find all payments for a job.

        Args:
            job_id: Job ID
            order_by: Sort order

        Returns:
            List of payments
        """
        return await self.find_all(
            filters={"job_id": job_id},
            order_by=order_by,
        )

    async def find_by_estimate(self, estimate_id: int) -> List[PaymentResponse]:
        """
        Find all payments linked to an estimate.

        Args:
            estimate_id: Estimate ID

        Returns:
            List of payments
        """
        return await self.find_all(
            filters={"estimate_id": estimate_id},
            order_by="-received_date",
        )

    async def sum_by_job(self, job_id: int) -> float:
        """
        Get total payments for a job.

        Args:
            job_id: Job ID

        Returns:
            Sum of all payments
        """
        try:
            result = (
                self._get_table()
                .select("amount")
                .eq("job_id", job_id)
                .execute()
            )

            total = sum(p.get("amount", 0) or 0 for p in result.data)
            return total

        except Exception as e:
            logger.error(f"Error summing payments for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_recent(
        self,
        days: int = 30,
        limit: int = 50,
    ) -> List[PaymentResponse]:
        """
        Find payments received in the last N days.

        Args:
            days: Number of days to look back
            limit: Max results

        Returns:
            List of recent payments
        """
        try:
            from datetime import datetime, timedelta
            cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

            result = (
                self._get_table()
                .select("*")
                .gte("received_date", cutoff)
                .order("received_date", desc=True)
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding recent payments: {e}")
            raise handle_supabase_error(e)

    async def find_undeposited(self, limit: int = 100) -> List[PaymentResponse]:
        """
        Find payments that haven't been deposited yet.

        Returns:
            List of undeposited payments
        """
        try:
            result = (
                self._get_table()
                .select("*")
                .is_("deposited_date", "null")
                .order("received_date")
                .limit(limit)
                .execute()
            )

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding undeposited payments: {e}")
            raise handle_supabase_error(e)
