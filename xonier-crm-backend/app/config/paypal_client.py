import httpx
import base64
from typing import Optional, Dict, Any
from app.core.config import get_setting
from app.utils.custom_exception import AppException
import logging

logger = logging.getLogger(__name__)


class PayPalClient:
   

    def __init__(self):
        settings = get_setting()
        
        self.client_id = settings.PAYPAL_CLIENT_ID
        self.client_secret = settings.PAYPAL_CLIENT_SECRET
        self.mode = settings.PAYPAL_MODE  
        self.project_name = settings.PROJECT_NAME

       
        if self.mode == "sandbox":
            self.base_url = "https://api-m.sandbox.paypal.com"
        else:
            self.base_url = "https://api-m.paypal.com"

        self._access_token: Optional[str] = None

    async def _get_access_token(self) -> str:
        
        try:
            credentials = f"{self.client_id}:{self.client_secret}"
            encoded = base64.b64encode(credentials.encode()).decode()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v1/oauth2/token",
                    headers={
                        "Authorization": f"Basic {encoded}",
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    data={"grant_type": "client_credentials"}
                )

                if response.status_code != 200:
                    logger.error(f"PayPal token error: {response.text}")
                    raise AppException(502, "Failed to authenticate with PayPal")

                data = response.json()
                self._access_token = data["access_token"]
                return self._access_token

        except AppException:
            raise
        except Exception as e:
            logger.error(f"PayPal auth error: {str(e)}")
            raise AppException(502, f"PayPal authentication failed: {str(e)}")

    async def _get_headers(self) -> Dict[str, str]:
        
        token = await self._get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    async def create_order(
        self,
        amount: float,
        currency: str,
        description: str,
        return_url: str,
        cancel_url: str,
        custom_id: str,  
        items: Optional[list] = None
    ) -> Dict[str, Any]:
        
        try:
            headers = await self._get_headers()

            # Build items list
            item_list = []
            if items:
                for item in items:
                    item_list.append({
                        "name": item["name"],
                        "quantity": str(item["quantity"]),
                        "description": item.get("description", ""),
                        "unit_amount": {
                            "currency_code": currency,
                            "value": f"{item['unit_amount']:.2f}"
                        }
                    })

            payload = {
                "intent": "CAPTURE",
                "purchase_units": [
                    {
                        "custom_id": custom_id,  # our internal payment ID
                        "description": description,
                        "amount": {
                            "currency_code": currency,
                            "value": f"{amount:.2f}",
                            **(
                                {
                                    "breakdown": {
                                        "item_total": {
                                            "currency_code": currency,
                                            "value": f"{amount:.2f}"
                                        }
                                    }
                                }
                                if item_list else {}
                            )
                        },
                        **({"items": item_list} if item_list else {})
                    }
                ],
                "application_context": {
                    "return_url": return_url,
                    "cancel_url": cancel_url,
                    "brand_name": self.project_name,
                    "landing_page": "BILLING",
                    "user_action": "PAY_NOW",
                    "shipping_preference": "NO_SHIPPING"
                }
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/checkout/orders",
                    headers=headers,
                    json=payload
                )

                if response.status_code not in [200, 201]:
                    logger.error(f"PayPal create order error: {response.text}")
                    raise AppException(502, "Failed to create PayPal order")

                return response.json()

        except AppException:
            raise
        except Exception as e:
            logger.error(f"PayPal create order error: {str(e)}")
            raise AppException(502, f"PayPal order creation failed: {str(e)}")

    async def capture_order(
        self,
        paypal_order_id: str
    ) -> Dict[str, Any]:
        """
        Capture an approved PayPal order
        """
        try:
            headers = await self._get_headers()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/checkout/orders/{paypal_order_id}/capture",
                    headers=headers,
                    json={}
                )

                if response.status_code not in [200, 201]:
                    logger.error(f"PayPal capture error: {response.text}")
                    raise AppException(400, "Failed to capture PayPal payment")

                return response.json()

        except AppException:
            raise
        except Exception as e:
            logger.error(f"PayPal capture error: {str(e)}")
            raise AppException(502, f"PayPal capture failed: {str(e)}")

    async def get_order(
        self,
        paypal_order_id: str
    ) -> Dict[str, Any]:
        """
        Get PayPal order details
        """
        try:
            headers = await self._get_headers()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/v2/checkout/orders/{paypal_order_id}",
                    headers=headers
                )

                if response.status_code != 200:
                    raise AppException(404, "PayPal order not found")

                return response.json()

        except AppException:
            raise
        except Exception as e:
            raise AppException(502, f"Failed to get PayPal order: {str(e)}")

    async def refund_capture(
        self,
        capture_id: str,
        amount: Optional[float] = None,
        currency: str = "USD",
        reason: str = ""
    ) -> Dict[str, Any]:
        
        try:
            headers = await self._get_headers()

            payload = {}
            if amount:
                payload = {
                    "amount": {
                        "value": f"{amount:.2f}",
                        "currency_code": currency
                    },
                    "note_to_payer": reason
                }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v2/payments/captures/{capture_id}/refund",
                    headers=headers,
                    json=payload
                )

                if response.status_code not in [200, 201]:
                    logger.error(f"PayPal refund error: {response.text}")
                    raise AppException(400, "Failed to process refund")

                return response.json()

        except AppException:
            raise
        except Exception as e:
            logger.error(f"PayPal refund error: {str(e)}")
            raise AppException(502, f"PayPal refund failed: {str(e)}")

    async def verify_webhook_signature(
        self,
        headers: Dict[str, str],
        body: bytes,
        webhook_id: str
    ) -> bool:
        """
        Verify PayPal webhook signature
        """
        try:
            token = await self._get_access_token()

            payload = {
                "auth_algo": headers.get("paypal-auth-algo"),
                "cert_url": headers.get("paypal-cert-url"),
                "transmission_id": headers.get("paypal-transmission-id"),
                "transmission_sig": headers.get("paypal-transmission-sig"),
                "transmission_time": headers.get("paypal-transmission-time"),
                "webhook_id": webhook_id,
                "webhook_event": body.decode("utf-8")
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v1/notifications/verify-webhook-signature",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )

                if response.status_code != 200:
                    return False

                data = response.json()
                return data.get("verification_status") == "SUCCESS"

        except Exception as e:
            logger.error(f"Webhook verification error: {str(e)}")
            return False



paypal_client = PayPalClient()