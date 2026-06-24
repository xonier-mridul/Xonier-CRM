from fastapi import Request
from app.utils.custom_exception import AppException
from app.services.payment_service import PaymentService
from app.schemas.payment_schema import (
    CreateOrderSchema,
    CapturePaymentSchema,
    RefundPaymentSchema
)
from app.utils.custom_response import successResponse


class PaymentController:

    def __init__(self):
        self.service = PaymentService()

    # =========================================================
    # CREATE ORDER
    # =========================================================

    async def createOrder(self, request: Request, body: CreateOrderSchema):
        try:
            user = request.state.user
            result = await self.service.create_order(
                data=body.model_dump(),
                user=user
            )
            return successResponse(
                201,
                "PayPal order created successfully",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # CAPTURE PAYMENT
    # =========================================================

    async def capturePayment(
        self,
        request: Request,
        paypal_order_id: str,
        body: CapturePaymentSchema
    ):
        try:
            user = request.state.user
            result = await self.service.capture_payment(
                paypal_order_id=paypal_order_id,
                data=body.model_dump(),
                user=user
            )
            return successResponse(
                200,
                "Payment captured successfully. Subscription activated!",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # CANCEL PAYMENT
    # =========================================================

    async def cancelPayment(
        self,
        request: Request,
        paypal_order_id: str
    ):
        try:
            user = request.state.user
            result = await self.service.cancel_payment(
                paypal_order_id=paypal_order_id,
                user=user
            )
            return successResponse(
                200,
                "Payment cancelled successfully",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # REFUND PAYMENT
    # =========================================================

    async def refundPayment(
        self,
        request: Request,
        payment_id: str,
        body: RefundPaymentSchema
    ):
        try:
            user = request.state.user
            result = await self.service.refund_payment(
                payment_id=payment_id,
                data=body.model_dump(),
                user=user
            )
            return successResponse(
                200,
                "Refund processed successfully",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # GET PAYMENT BY ID
    # =========================================================

    async def getPaymentById(self, request: Request, payment_id: str):
        try:
            user = request.state.user
            result = await self.service.get_payment_by_id(
                payment_id=payment_id,
                user=user
            )
            return successResponse(
                200,
                "Payment details fetched successfully",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # GET ALL PAYMENTS (Admin)
    # =========================================================

    async def getAllPayments(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_all_payments(
                filters=filters,
                user=user
            )
            return successResponse(
                200,
                "All payments fetched successfully",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # GET MY PAYMENTS (Current User/Company)
    # =========================================================

    async def getMyPayments(self, request: Request):
        try:
            user = request.state.user
            filters = dict(request.query_params)
            result = await self.service.get_my_payments(
                filters=filters,
                user=user
            )
            return successResponse(
                200,
                "Your payment history fetched successfully",
                result
            )
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Internal server error: {str(e)}")

    # =========================================================
    # WEBHOOK
    # =========================================================

    async def handleWebhook(self, request: Request):
        try:
            body = await request.body()
            headers = dict(request.headers)
            result = await self.service.handle_webhook(
                headers=headers,
                body=body
            )
            return successResponse(200, "Webhook processed", result)
        except AppException as e:
            raise e
        except Exception as e:
            raise AppException(500, f"Webhook error: {str(e)}")