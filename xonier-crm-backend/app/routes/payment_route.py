from fastapi import APIRouter, Depends, Request
from app.core.dependencies import Dependencies
from app.controllers.payment_controller import PaymentController
from app.schemas.payment_schema import (
    CreateOrderSchema,
    CapturePaymentSchema,
    RefundPaymentSchema
)

router = APIRouter()
dependencies = Dependencies()
controller = PaymentController()


# ─────────────────────────────────────────────
# PUBLIC ROUTES
# ─────────────────────────────────────────────

# PayPal webhook (no auth - PayPal calls this directly)
@router.post(
    "/webhook",
    status_code=200
)
async def paypal_webhook(request: Request):
    """PayPal webhook endpoint - called by PayPal automatically"""
    return await controller.handleWebhook(request)


# ─────────────────────────────────────────────
# AUTHENTICATED ROUTES (Any logged in user)
# ─────────────────────────────────────────────

# Create PayPal order - user selects plan and clicks pay
@router.post(
    "/create-order",
    status_code=201,
    dependencies=[Depends(dependencies.authorized)]
)
async def create_order(request: Request, body: CreateOrderSchema):
    """
    Create a PayPal order for plan purchase.
    Returns approval_url to redirect user to PayPal.
    """
    return await controller.createOrder(request, body)


# Capture payment - called after user approves on PayPal
@router.post(
    "/capture/{paypal_order_id}",
    status_code=200,
    dependencies=[Depends(dependencies.authorized)]
)
async def capture_payment(
    request: Request,
    paypal_order_id: str,
    body: CapturePaymentSchema
):
    """
    Capture approved PayPal payment.
    Call this after PayPal redirects back with PayerID.
    """
    return await controller.capturePayment(request, paypal_order_id, body)


# Cancel payment - called when user cancels on PayPal
@router.post(
    "/cancel/{paypal_order_id}",
    status_code=200,
    dependencies=[Depends(dependencies.authorized)]
)
async def cancel_payment(request: Request, paypal_order_id: str):
    """
    Cancel a pending PayPal payment.
    Call this when user cancels on PayPal page.
    """
    return await controller.cancelPayment(request, paypal_order_id)


# Get single payment details
@router.get(
    "/{payment_id}",
    status_code=200,
    dependencies=[Depends(dependencies.authorized)]
)
async def get_payment(request: Request, payment_id: str):
    """Get single payment details by payment_id"""
    return await controller.getPaymentById(request, payment_id)


# Get my payments (company/user payment history)
@router.get(
    "/my/history",
    status_code=200,
    dependencies=[Depends(dependencies.authorized)]
)
async def get_my_payments(request: Request):
    """
    Get payment history for current logged-in user's company.
    Supports: ?page=1&limit=10&status=COMPLETED
    """
    return await controller.getMyPayments(request)


# Refund payment
@router.post(
    "/refund/{payment_id}",
    status_code=200,
    dependencies=[Depends(dependencies.authorized)]
)
async def refund_payment(
    request: Request,
    payment_id: str,
    body: RefundPaymentSchema
):
    """
    Refund a completed payment.
    Full refund if amount not provided.
    """
    return await controller.refundPayment(request, payment_id, body)


# ─────────────────────────────────────────────
# ADMIN ONLY ROUTES
# ─────────────────────────────────────────────

# Get all payments (admin only)
@router.get(
    "/",
    status_code=200,
    dependencies=[
        Depends(dependencies.authorized),
        Depends(dependencies.onlyForAdmin)
    ]
)
async def get_all_payments(request: Request):
    """
    Get all payments (Admin only).
    Supports: ?page=1&limit=10&status=COMPLETED&search=xxx&billing_cycle=monthly
    """
    return await controller.getAllPayments(request)