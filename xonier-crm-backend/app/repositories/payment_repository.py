from app.repositories.base_repository import BaseRepository
from app.db.models.payment_model import PaymentModel
from typing import Optional, Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorClientSession
from beanie import PydanticObjectId
from app.core.enums import PAYMENT_STATUS


class PaymentRepository(BaseRepository):
    def __init__(self):
        super().__init__(PaymentModel)

    async def find_by_paypal_order_id(
        self,
        paypal_order_id: str,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Optional[PaymentModel]:
        """Find payment by PayPal order ID"""
        return await self.find_one(
            filter={"paypalOrderId": paypal_order_id},
            populate=populate,
            session=session,
        )

    async def find_by_payment_id(
        self,
        payment_id: str,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Optional[PaymentModel]:
        """Find payment by internal payment ID"""
        return await self.find_one(
            filter={"paymentId": payment_id, "deletedAt": None},
            populate=populate,
            session=session,
        )

    async def find_by_transaction_id(
        self,
        transaction_id: str,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Optional[PaymentModel]:
        """Find payment by PayPal transaction/capture ID"""
        return await self.find_one(
            filter={"paypalTransactionId": transaction_id, "deletedAt": None},
            populate=populate,
            session=session,
        )

    async def find_by_subscription_id(
        self,
        subscription_id: PydanticObjectId,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Optional[PaymentModel]:
        """Find payment by subscription ID"""
        return await self.find_one(
            filter={"subscriptionId": subscription_id, "deletedAt": None},
            populate=populate,
            session=session,
        )

    async def find_by_company(
        self,
        company_id: PydanticObjectId,
        status: Optional[PAYMENT_STATUS] = None,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        """Find all payments for a company"""
        filters = {"companyId": company_id, "deletedAt": None}
        
        if status:
            filters["status"] = status
            
        return await self.find_many(
            filters=filters,
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def find_completed_by_company(
        self,
        company_id: PydanticObjectId,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        """Find all completed payments for a company"""
        return await self.find_many(
            filters={
                "companyId": company_id,
                "status": PAYMENT_STATUS.COMPLETED,
                "deletedAt": None,
            },
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def find_pending_by_company(
        self,
        company_id: PydanticObjectId,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        """Find all pending payments for a company"""
        return await self.find_many(
            filters={
                "companyId": company_id,
                "status": PAYMENT_STATUS.PENDING,
                "deletedAt": None,
            },
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def get_company_payments_paginated(
        self,
        company_id: PydanticObjectId,
        page: int = 1,
        limit: int = 10,
        status: Optional[PAYMENT_STATUS] = None,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Dict[str, Any]:
        """Get paginated payments for a company"""
        filters = {"companyId": company_id, "deletedAt": None}
        
        if status:
            filters["status"] = status
            
        return await self.get_all(
            page=page,
            limit=limit,
            filters=filters,
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def get_all_payments_paginated(
        self,
        page: int = 1,
        limit: int = 10,
        filters: Optional[Dict[str, Any]] = None,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Dict[str, Any]:
        """Get all payments with pagination (Admin)"""
        filters = filters or {}
        filters["deletedAt"] = None
        
        return await self.get_all(
            page=page,
            limit=limit,
            filters=filters,
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def update_by_paypal_order_id(
        self,
        paypal_order_id: str,
        data: Dict[str, Any],
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> int:
        """Update payment by PayPal order ID"""
        payment = await self.find_by_paypal_order_id(
            paypal_order_id=paypal_order_id,
            session=session
        )
        
        if not payment:
            return 0
            
        return await self.update(
            id=payment.id,
            data=data,
            session=session
        )

    async def update_by_payment_id(
        self,
        payment_id: str,
        data: Dict[str, Any],
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> int:
        """Update payment by internal payment ID"""
        payment = await self.find_by_payment_id(
            payment_id=payment_id,
            session=session
        )
        
        if not payment:
            return 0
            
        return await self.update(
            id=payment.id,
            data=data,
            session=session
        )

    async def count_by_company(
        self,
        company_id: PydanticObjectId,
        status: Optional[PAYMENT_STATUS] = None,
    ) -> int:
        """Count payments for a company"""
        filters = {"companyId": company_id, "deletedAt": None}
        
        if status:
            filters["status"] = status
            
        return await self.count(filter=filters)

    async def count_by_status(
        self,
        status: PAYMENT_STATUS,
    ) -> int:
        """Count payments by status"""
        return await self.count(
            filter={"status": status, "deletedAt": None}
        )

    async def get_total_revenue_by_company(
        self,
        company_id: PydanticObjectId,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> float:
        """Calculate total revenue for a company (completed payments only)"""
        payments = await self.find_completed_by_company(
            company_id=company_id,
            session=session
        )
        
        total = sum(payment.finalAmount for payment in payments)
        return round(total, 2)

    async def find_refundable_payment(
        self,
        payment_id: str,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Optional[PaymentModel]:
        """Find a payment that can be refunded"""
        return await self.find_one(
            filter={
                "paymentId": payment_id,
                "status": PAYMENT_STATUS.COMPLETED,
                "deletedAt": None,
            },
            populate=populate,
            session=session,
        )

    async def find_pending_expired_payments(
        self,
        hours: int = 24,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        """Find pending payments older than specified hours"""
        from datetime import datetime, timezone, timedelta
        
        expiry_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        return await self.find_many(
            filters={
                "status": PAYMENT_STATUS.PENDING,
                "createdAt": {"$lt": expiry_time},
                "deletedAt": None,
            },
            session=session,
        )

    async def bulk_update_expired_payments(
        self,
        hours: int = 24,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> int:
        """Mark expired pending payments as cancelled"""
        from datetime import datetime, timezone, timedelta
        
        expiry_time = datetime.now(timezone.utc) - timedelta(hours=hours)
        
        return await self.bulk_update(
            filters={
                "status": PAYMENT_STATUS.PENDING,
                "createdAt": {"$lt": expiry_time},
                "deletedAt": None,
            },
            data={
                "status": PAYMENT_STATUS.CANCELLED,
                "failureReason": "Payment expired after 24 hours",
                "updatedAt": datetime.now(timezone.utc),
            },
            session=session,
        )

    async def soft_delete_by_id(
        self,
        payment_id: PydanticObjectId,
        deleted_by: PydanticObjectId,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> int:
        """Soft delete a payment record"""
        from datetime import datetime, timezone
        
        return await self.update(
            id=payment_id,
            data={
                "deletedAt": datetime.now(timezone.utc),
                "deletedBy": deleted_by,
            },
            session=session,
        )

    async def get_payments_by_plan(
        self,
        plan_id: PydanticObjectId,
        page: int = 1,
        limit: int = 10,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Dict[str, Any]:
        """Get all payments for a specific plan"""
        return await self.get_all(
            page=page,
            limit=limit,
            filters={
                "planId": plan_id,
                "deletedAt": None,
            },
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def get_payments_by_date_range(
        self,
        start_date,
        end_date,
        page: int = 1,
        limit: int = 10,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ) -> Dict[str, Any]:
        """Get payments within a date range"""
        return await self.get_all(
            page=page,
            limit=limit,
            filters={
                "createdAt": {
                    "$gte": start_date,
                    "$lte": end_date,
                },
                "deletedAt": None,
            },
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )

    async def find_by_user(
        self,
        user_id: PydanticObjectId,
        populate: Optional[List[str]] = None,
        session: Optional[AsyncIOMotorClientSession] = None,
    ):
        """Find all payments created by a user"""
        return await self.find_many(
            filters={
                "createdBy": user_id,
                "deletedAt": None,
            },
            populate=populate,
            session=session,
            sort=[("createdAt", -1)]
        )