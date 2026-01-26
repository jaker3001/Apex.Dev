"""
Repository for business.receipts table.

Manages expense and receipt tracking for jobs.
"""
from typing import List, Optional
from api.repositories.base import BaseRepository
from api.schemas.operations import ReceiptResponse
from api.services.supabase_errors import handle_supabase_error
import logging

logger = logging.getLogger("apex_assistant.repository.receipt")


class ReceiptRepository(BaseRepository[ReceiptResponse]):
    """Repository for receipts/expenses."""

    def __init__(self):
        super().__init__(
            table_name="receipts",
            schema="business",
            model=ReceiptResponse,
        )

    async def find_by_job(
        self,
        job_id: int,
        order_by: str = "-expense_date",
    ) -> List[ReceiptResponse]:
        """
        Find all receipts for a job.

        Args:
            job_id: Job ID
            order_by: Sort order

        Returns:
            List of receipts
        """
        return await self.find_all(
            filters={"job_id": job_id},
            order_by=order_by,
        )

    async def find_by_category(
        self,
        job_id: int,
        category: str,
    ) -> List[ReceiptResponse]:
        """
        Find receipts by expense category.

        Args:
            job_id: Job ID
            category: Expense category

        Returns:
            List of receipts
        """
        return await self.find_all(
            filters={"job_id": job_id, "expense_category": category},
            order_by="-expense_date",
        )

    async def find_by_vendor(
        self,
        vendor_id: int,
        limit: int = 100,
    ) -> List[ReceiptResponse]:
        """
        Find all receipts from a vendor.

        Args:
            vendor_id: Vendor organization ID
            limit: Max results

        Returns:
            List of receipts
        """
        return await self.find_all(
            filters={"vendor_id": vendor_id},
            order_by="-expense_date",
            limit=limit,
        )

    async def sum_by_job(
        self,
        job_id: int,
        reimbursable_only: bool = False,
    ) -> float:
        """
        Get total expenses for a job.

        Args:
            job_id: Job ID
            reimbursable_only: Only sum reimbursable expenses

        Returns:
            Total expense amount
        """
        try:
            query = (
                self._get_table()
                .select("amount")
                .eq("job_id", job_id)
            )

            if reimbursable_only:
                query = query.eq("reimbursable", True)

            result = query.execute()

            total = sum(r.get("amount", 0) or 0 for r in result.data)
            return total

        except Exception as e:
            logger.error(f"Error summing receipts for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def sum_by_category(self, job_id: int) -> dict:
        """
        Get expense totals by category for a job.

        Args:
            job_id: Job ID

        Returns:
            Dict mapping category to total
        """
        try:
            result = (
                self._get_table()
                .select("expense_category, amount")
                .eq("job_id", job_id)
                .execute()
            )

            totals = {}
            for r in result.data:
                category = r.get("expense_category", "uncategorized")
                amount = r.get("amount", 0) or 0
                totals[category] = totals.get(category, 0) + amount

            return totals

        except Exception as e:
            logger.error(f"Error summing receipts by category for job {job_id}: {e}")
            raise handle_supabase_error(e)

    async def find_reimbursable(
        self,
        job_id: Optional[int] = None,
        limit: int = 100,
    ) -> List[ReceiptResponse]:
        """
        Find all reimbursable receipts.

        Args:
            job_id: Optional job filter
            limit: Max results

        Returns:
            List of reimbursable receipts
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .eq("reimbursable", True)
            )

            if job_id:
                query = query.eq("job_id", job_id)

            result = query.order("expense_date", desc=True).limit(limit).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding reimbursable receipts: {e}")
            raise handle_supabase_error(e)

    async def find_by_date_range(
        self,
        start_date: str,
        end_date: str,
        job_id: Optional[int] = None,
    ) -> List[ReceiptResponse]:
        """
        Find receipts within a date range.

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            job_id: Optional job filter

        Returns:
            List of receipts
        """
        try:
            query = (
                self._get_table()
                .select("*")
                .gte("expense_date", start_date)
                .lte("expense_date", end_date)
            )

            if job_id:
                query = query.eq("job_id", job_id)

            result = query.order("expense_date", desc=True).execute()

            return [self.model(**item) for item in result.data]

        except Exception as e:
            logger.error(f"Error finding receipts by date range: {e}")
            raise handle_supabase_error(e)
