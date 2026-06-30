from typing import Any, Dict, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi.encoders import jsonable_encoder
from app.core.enums import PLAN_STATUS
import logging

from app.utils.custom_exception import AppException
from app.repositories.payment_repository import PaymentRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.config.paypal_client import paypal_client
from app.db.models.payment_model import PaymentModel
from app.db.models.plan_model import PlanModel
from app.db.models.subscription_model import SubscriptionModel
from app.core.enums import PAYMENT_STATUS, SUBSCRIPTION_STATUS, BILLING_CYCLE
from app.core.config import get_setting  # ✅ Updated import
from app.core.tenant import system_query
from beanie import PydanticObjectId

logger = logging.getLogger(__name__)


class PaymentService:

    def __init__(self):
        self.payment_repo = PaymentRepository()
        self.subscription_repo = SubscriptionRepository()

    

    def _calculate_amount(
        self,
        plan: PlanModel,
        billing_cycle: str
    ) -> Dict[str, float]:
        """Calculate final amount after discount"""
        base_price = (
            plan.price.monthlyPrice
            if billing_cycle == "monthly"
            else plan.price.yearlyPrice
        )

        discount_amount = 0.0
        now = datetime.now(timezone.utc)

        discount_valid = (
            plan.discount is not None and
            plan.discount > 0 and
            (plan.discountTill is None or plan.discountTill > now)
        )

        discount_applies = (
            discount_valid and (
                plan.discountApply == "both" or
                plan.discountApply == billing_cycle
            )
        )

        if discount_applies:
            if plan.discountType == "PERCENTAGE":
                discount_amount = (base_price * plan.discount) / 100
            else:
                discount_amount = min(plan.discount, base_price)

        final_amount = round(base_price - discount_amount, 2)

        return {
            "base_price": base_price,
            "discount_amount": round(discount_amount, 2),
            "final_amount": final_amount
        }

    def _get_subscription_dates(
        self,
        billing_cycle: str,
        trial_days: int = 0
    ) -> Dict[str, Optional[datetime]]:
        """Calculate subscription start/end dates"""
        now = datetime.now(timezone.utc)

        trial_start = None
        trial_end = None
        start_date = now

        if trial_days > 0:
            trial_start = now
            trial_end = now + timedelta(days=trial_days)
            start_date = trial_end

        if billing_cycle == "monthly":
            end_date = start_date + timedelta(days=30)
        else:
            end_date = start_date + timedelta(days=365)

        return {
            "start_date": start_date,
            "end_date": end_date,
            "trial_start": trial_start,
            "trial_end": trial_end
        }



    async def create_order(
        self,
        data: Dict[str, Any],
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Step 1: Create PayPal order and return approval URL"""
        try:
            settings = get_setting()  
            
            plan_id = data.get("plan_id")
            billing_cycle = data.get("billing_cycle", "monthly")

            if not ObjectId.is_valid(plan_id):
                raise AppException(400, "Invalid plan ID")

            
            plan = await PlanModel.find_one(
                PlanModel.id == PydanticObjectId(plan_id),
                PlanModel.deletedAt == None
            )

            if not plan:
                raise AppException(404, "Plan not found")

            if plan.status.value != PLAN_STATUS.ACTIVE.value:
                raise AppException(400, "This plan is not available for purchase")

            # Check if company already has active subscription
            company_id = user.get("companyId") or user.get("company_id")
            
            if company_id:
                company_obj_id = PydanticObjectId(str(company_id))
                
                existing_sub = await self.subscription_repo.find_active_by_company(
                    company_id=company_obj_id
                )

                if existing_sub:
                    raise AppException(
                        400,
                        "You already have an active subscription. "
                        "Please cancel it before purchasing a new one."
                    )

            # Calculate amount
            amounts = self._calculate_amount(plan, billing_cycle)

            # Create payment record in DB
            payment_data = {
                "planId": plan.id,
                "companyId": company_obj_id if company_id else None,
                "createdBy": PydanticObjectId(str(user["_id"])),
                "billingCycle": billing_cycle,
                "currency": plan.currency or "USD",
                "amount": amounts["base_price"],
                "discountAmount": amounts["discount_amount"],
                "finalAmount": amounts["final_amount"],
                "status": PAYMENT_STATUS.PENDING,
            }

            payment = await self.payment_repo.create(payment_data)

            # ✅ Build return/cancel URLs using CLIENT_URL
            return_url = (
                f"{settings.CLIENT_URL}/payment/success"
                f"?payment_id={payment.paymentId}"
            )
            cancel_url = (
                f"{settings.CLIENT_URL}/payment/cancel"
                f"?payment_id={payment.paymentId}"
            )

            # Build items for PayPal
            items = [
                {
                    "name": plan.name,
                    "quantity": 1,
                    "unit_amount": amounts["final_amount"],
                    "description": f"{plan.name} - {billing_cycle.capitalize()} Plan"
                }
            ]

            # Create PayPal order
            paypal_order = await paypal_client.create_order(
                amount=amounts["final_amount"],
                currency=plan.currency or "USD",
                description=f"{plan.name} - {billing_cycle.capitalize()} Subscription",
                return_url=return_url,
                cancel_url=cancel_url,
                custom_id=payment.paymentId,
                items=items
            )

            # Update payment with PayPal order ID
            await self.payment_repo.update_by_payment_id(
                payment_id=payment.paymentId,
                data={"paypalOrderId": paypal_order["id"]}
            )

            # Extract approval URL
            approval_url = next(
                (
                    link["href"]
                    for link in paypal_order.get("links", [])
                    if link["rel"] == "approve"
                ),
                None
            )

            if not approval_url:
                raise AppException(502, "Failed to get PayPal approval URL")

            return {
                "payment_id": payment.paymentId,
                "paypal_order_id": paypal_order["id"],
                "approval_url": approval_url,
                "amount": amounts["final_amount"],
                "currency": plan.currency or "USD",
                "billing_cycle": billing_cycle,
                "plan": {
                    "id": str(plan.id),
                    "name": plan.name,
                    "description": plan.description,
                }
            }

        except AppException as e:
            raise e
        except Exception as e:
            logger.error(f"Create order error: {str(e)}")
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # CAPTURE PAYMENT
    # =========================================================

    async def capture_payment(
        self,
        paypal_order_id: str,
        data: Dict[str, Any],
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Step 2: Capture approved PayPal payment"""
        try:
            payer_id = data.get("payer_id")

            payment = await self.payment_repo.find_by_paypal_order_id(
                paypal_order_id=paypal_order_id,
                populate=["planId", "companyId"]
            )

            if not payment:
                raise AppException(404, "Payment record not found")

            if payment.status == PAYMENT_STATUS.COMPLETED:
                raise AppException(400, "Payment already captured")

            if payment.status == PAYMENT_STATUS.CANCELLED:
                raise AppException(400, "This payment has been cancelled")

            if payment.status == PAYMENT_STATUS.FAILED:
                raise AppException(400, "This payment has failed")

            # Capture payment on PayPal
            capture_response = await paypal_client.capture_order(paypal_order_id)

            paypal_status = capture_response.get("status")

            if paypal_status != "COMPLETED":
                await self.payment_repo.update_by_paypal_order_id(
                    paypal_order_id=paypal_order_id,
                    data={
                        "status": PAYMENT_STATUS.FAILED,
                        "failureReason": f"PayPal status: {paypal_status}",
                        "updatedAt": datetime.now(timezone.utc)
                    }
                )
                raise AppException(400, f"Payment not completed. Status: {paypal_status}")


            capture_id = None
            payer_email = None
            payer_name = None

            purchase_units = capture_response.get("purchase_units", [])
            if purchase_units:
                captures = purchase_units[0].get("payments", {}).get("captures", [])
                if captures:
                    capture_id = captures[0].get("id")

            payer_info = capture_response.get("payer", {})
            payer_email = payer_info.get("email_address")
            payer_name_obj = payer_info.get("name", {})
            payer_name = (
                f"{payer_name_obj.get('given_name', '')} "
                f"{payer_name_obj.get('surname', '')}".strip()
            )

            # Update payment record
            await self.payment_repo.update_by_paypal_order_id(
                paypal_order_id=paypal_order_id,
                data={
                    "status": PAYMENT_STATUS.COMPLETED,
                    "paypalTransactionId": capture_id,
                    "paypalPayerId": payer_id,
                    "updatedAt": datetime.now(timezone.utc)
                }
            )

            # Fetch updated payment
            updated_payment = await self.payment_repo.find_by_paypal_order_id(
                paypal_order_id=paypal_order_id,
                populate=["planId"]
            )

            # ---- CREATE SUBSCRIPTION ----
            plan = updated_payment.planId
            billing_cycle = updated_payment.billingCycle

            dates = self._get_subscription_dates(
                billing_cycle=billing_cycle,
                trial_days=getattr(plan, "trial_days", 0)
            )

            company_id = (
                updated_payment.companyId.id
                if updated_payment.companyId
                else None
            )

            subscription_data = {
                "planId": plan.id,
                "companyId": company_id,
                "billingCycle": (
                    BILLING_CYCLE.MONTHLY
                    if billing_cycle == "monthly"
                    else BILLING_CYCLE.YEARLY
                ),
                "basePrice": updated_payment.amount,
                "discountAmount": updated_payment.discountAmount,
                "finalPrice": updated_payment.finalAmount,
                "status": SUBSCRIPTION_STATUS.ACTIVE,
                "startSubscriptionDate": dates["start_date"],
                "endSubscriptionDate": dates["end_date"],
                "trialStartDate": dates["trial_start"],
                "trialEndDate": dates["trial_end"],
                "createdBy": PydanticObjectId(str(user["_id"])),
                "createdAt": datetime.now(timezone.utc),
            }

            subscription = await self.subscription_repo.create(subscription_data)

            # Link subscription to payment
            await self.payment_repo.update_by_paypal_order_id(
                paypal_order_id=paypal_order_id,
                data={"subscriptionId": subscription.id}
            )

            return {
                "payment_id": updated_payment.paymentId,
                "paypal_order_id": paypal_order_id,
                "transaction_id": capture_id,
                "status": "COMPLETED",
                "amount": updated_payment.finalAmount,
                "currency": updated_payment.currency,
                "payer": {
                    "email": payer_email,
                    "name": payer_name,
                    "payer_id": payer_id
                },
                "subscription": {
                    "subscription_id": subscription.subscriptionId,
                    "status": subscription.status,
                    "start_date": subscription.startSubscriptionDate.isoformat(),
                    "end_date": subscription.endSubscriptionDate.isoformat()
                    if subscription.endSubscriptionDate else None,
                    "trial_end_date": subscription.trialEndDate.isoformat()
                    if subscription.trialEndDate else None,
                },
                "captured_at": datetime.now(timezone.utc).isoformat()
            }

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Capture payment error: {str(e)}")
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # CANCEL PAYMENT
    # =========================================================

    async def cancel_payment(
        self,
        paypal_order_id: str,
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Cancel a pending payment"""
        try:
            payment = await self.payment_repo.find_by_paypal_order_id(
                paypal_order_id=paypal_order_id
            )

            if not payment:
                raise AppException(404, "Payment not found")

            if payment.status == PAYMENT_STATUS.COMPLETED:
                raise AppException(
                    400,
                    "Cannot cancel a completed payment. Request a refund instead."
                )

            if payment.status == PAYMENT_STATUS.CANCELLED:
                raise AppException(400, "Payment already cancelled")

            await self.payment_repo.update_by_paypal_order_id(
                paypal_order_id=paypal_order_id,
                data={
                    "status": PAYMENT_STATUS.CANCELLED,
                    "updatedAt": datetime.now(timezone.utc)
                }
            )

            return {
                "payment_id": payment.paymentId,
                "paypal_order_id": paypal_order_id,
                "status": "CANCELLED"
            }

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # REFUND PAYMENT
    # =========================================================

    async def refund_payment(
        self,
        payment_id: str,
        data: Dict[str, Any],
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Refund a completed payment"""
        try:
            payment = await self.payment_repo.find_refundable_payment(
                payment_id=payment_id
            )

            if not payment:
                raise AppException(
                    404,
                    "Payment not found or not eligible for refund"
                )

            if not payment.paypalTransactionId:
                raise AppException(400, "No capture ID found for this payment")

            refund_amount = data.get("amount")
            reason = data.get("reason", "")

            # Process refund via PayPal
            refund_response = await paypal_client.refund_capture(
                capture_id=payment.paypalTransactionId,
                amount=refund_amount,
                currency=payment.currency,
                reason=reason
            )

            refund_id = refund_response.get("id")
            refund_status = refund_response.get("status")

            # Determine new payment status
            is_full_refund = (
                refund_amount is None or
                refund_amount >= payment.finalAmount
            )
            new_status = (
                PAYMENT_STATUS.REFUNDED
                if is_full_refund
                else PAYMENT_STATUS.PARTIALLY_REFUNDED
            )

            # Update payment record
            await self.payment_repo.update_by_payment_id(
                payment_id=payment_id,
                data={
                    "status": new_status,
                    "refundId": refund_id,
                    "refundAmount": refund_amount or payment.finalAmount,
                    "refundReason": reason,
                    "refundedAt": datetime.now(timezone.utc),
                    "updatedAt": datetime.now(timezone.utc)
                }
            )

            # If full refund - cancel the subscription
            if is_full_refund and payment.subscriptionId:
                sub_id = (
                    payment.subscriptionId.id
                    if hasattr(payment.subscriptionId, "id")
                    else payment.subscriptionId
                )
                
                subscription = await SubscriptionModel.find_one(
                    SubscriptionModel.id == sub_id
                )
                
                if subscription:
                    subscription.status = SUBSCRIPTION_STATUS.CANCELLED
                    subscription.cancelledAt = datetime.now(timezone.utc)
                    subscription.cancelReason = f"Refund processed: {reason}"
                    subscription.updatedAt = datetime.now(timezone.utc)
                    await subscription.save()

            return {
                "payment_id": payment.paymentId,
                "refund_id": refund_id,
                "transaction_id": payment.paypalTransactionId,
                "refund_status": refund_status,
                "refund_amount": refund_amount or payment.finalAmount,
                "currency": payment.currency,
                "is_full_refund": is_full_refund,
                "refunded_at": datetime.now(timezone.utc).isoformat()
            }

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Refund error: {str(e)}")
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # GET PAYMENT BY ID
    # =========================================================

    async def get_payment_by_id(
        self,
        payment_id: str,
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get single payment details"""
        try:
            payment = await self.payment_repo.find_by_payment_id(
                payment_id=payment_id,
                populate=["planId", "companyId", "subscriptionId"]
            )

            if not payment:
                raise AppException(404, "Payment not found")

            return jsonable_encoder(payment)

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # GET ALL PAYMENTS (Admin)
    # =========================================================

    async def get_all_payments(
        self,
        filters: Dict[str, Any],
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get all payments with filters (Admin only)"""
        try:
            page = max(int(filters.get("page", 1)), 1)
            limit = max(int(filters.get("limit", 10)), 1)

            query: Dict[str, Any] = {}

            # Search
            if filters.get("search") and filters["search"].strip():
                regex_data = {
                    "$regex": filters["search"].strip(),
                    "$options": "i"
                }
                query["$or"] = [
                    {"paymentId": regex_data},
                    {"paypalOrderId": regex_data},
                    {"paypalTransactionId": regex_data},
                ]

            # Status filter
            if filters.get("status"):
                query["status"] = filters["status"]

            # Billing cycle filter
            if filters.get("billing_cycle"):
                query["billingCycle"] = filters["billing_cycle"]

            # Currency filter
            if filters.get("currency"):
                query["currency"] = filters["currency"]

            with system_query():
                result = await self.payment_repo.get_all_payments_paginated(
                    page=page,
                    limit=limit,
                    filters=query,
                    populate=["planId", "companyId"]
                )

            return result

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # GET MY PAYMENTS
    # =========================================================

    async def get_my_payments(
        self,
        filters: Dict[str, Any],
        user: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get payments for current user's company"""
        try:
            page = max(int(filters.get("page", 1)), 1)
            limit = max(int(filters.get("limit", 10)), 1)

            company_id = user.get("companyId") or user.get("company_id")

            if not company_id:
                raise AppException(400, "Company not found for this user")

            company_obj_id = PydanticObjectId(str(company_id))

            status = filters.get("status")
            if status:
                try:
                    status = PAYMENT_STATUS(status)
                except ValueError:
                    status = None

            result = await self.payment_repo.get_company_payments_paginated(
                company_id=company_obj_id,
                page=page,
                limit=limit,
                status=status,
                populate=["planId", "subscriptionId"]
            )

            return result

        except AppException:
            raise
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # WEBHOOK HANDLER
    # =========================================================

    async def handle_webhook(
        self,
        headers: Dict[str, str],
        body: bytes
    ) -> Dict[str, Any]:
        """Handle PayPal webhook events"""
        try:
            import json
            
            settings = get_setting()  # ✅ Get settings instance

            # Verify webhook signature
            is_valid = await paypal_client.verify_webhook_signature(
                headers=dict(headers),
                body=body,
                webhook_id=settings.PAYPAL_WEBHOOK_ID
            )

            if not is_valid:
                logger.warning("Invalid PayPal webhook signature")
                raise AppException(400, "Invalid webhook signature")

            event = json.loads(body)
            event_type = event.get("event_type")
            resource = event.get("resource", {})

            logger.info(f"PayPal webhook received: {event_type}")

            # Handle different webhook events
            if event_type == "PAYMENT.CAPTURE.COMPLETED":
                await self._handle_capture_completed(resource)

            elif event_type == "PAYMENT.CAPTURE.DENIED":
                await self._handle_capture_denied(resource)

            elif event_type == "PAYMENT.CAPTURE.REFUNDED":
                await self._handle_capture_refunded(resource)

            elif event_type == "CHECKOUT.ORDER.APPROVED":
                await self._handle_order_approved(resource)

            else:
                logger.info(f"Unhandled webhook event: {event_type}")

            return {"status": "processed"}

        except AppException:
            raise
        except Exception as e:
            logger.error(f"Webhook handler error: {str(e)}")
            raise AppException(500, f"Webhook processing failed: {str(e)}")

    async def _handle_capture_completed(self, resource: Dict[str, Any]):
        """Handle PAYMENT.CAPTURE.COMPLETED webhook"""
        custom_id = resource.get("custom_id")
        if custom_id:
            payment = await self.payment_repo.find_by_payment_id(custom_id)
            if payment and payment.status != PAYMENT_STATUS.COMPLETED:
                await self.payment_repo.update_by_payment_id(
                    payment_id=custom_id,
                    data={
                        "status": PAYMENT_STATUS.COMPLETED,
                        "updatedAt": datetime.now(timezone.utc)
                    }
                )

    async def _handle_capture_denied(self, resource: Dict[str, Any]):
        """Handle PAYMENT.CAPTURE.DENIED webhook"""
        custom_id = resource.get("custom_id")
        if custom_id:
            payment = await self.payment_repo.find_by_payment_id(custom_id)
            if payment:
                await self.payment_repo.update_by_payment_id(
                    payment_id=custom_id,
                    data={
                        "status": PAYMENT_STATUS.FAILED,
                        "failureReason": "Payment capture denied by PayPal",
                        "updatedAt": datetime.now(timezone.utc)
                    }
                )

    async def _handle_capture_refunded(self, resource: Dict[str, Any]):
        """Handle PAYMENT.CAPTURE.REFUNDED webhook"""
        logger.info(f"Capture refunded: {resource.get('id')}")

    async def _handle_order_approved(self, resource: Dict[str, Any]):
        """Handle CHECKOUT.ORDER.APPROVED webhook"""
        order_id = resource.get("id")
        if order_id:
            await self.payment_repo.update_by_paypal_order_id(
                paypal_order_id=order_id,
                data={
                    "status": PAYMENT_STATUS.APPROVED,
                    "updatedAt": datetime.now(timezone.utc)
                }
            )