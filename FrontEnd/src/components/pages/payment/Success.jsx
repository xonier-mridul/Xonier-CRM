// pages/payment/PaymentSuccess.jsx

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import paymentServices from "../../../services/payment.services";

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const [isLoading, setIsLoading] = useState(false)

    const capturePayment = async () => {
        setIsLoading(true)
        try {
            const orderId = searchParams.get("token");
            const payerId = searchParams.get("PayerID");

            if (!orderId || !payerId) return;

            const response = await paymentServices.capturePayment(
                orderId,
                {
                    payer_id: payerId,
                }
            );

            console.log(response);

            if (response.success) {
                alert("Payment Completed Successfully");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false)
        }
    };

    useEffect(() => {
        capturePayment();

    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center" >
            {
                isLoading ?
                    <div>
                        Processing Payment...

                    </div> : <button
                        className="w-full mt-8 py-3 rounded-xl font-medium transition-all bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white" onClick={() => window.location.origin}>
                        Go back to home Page
                    </button>
            }
        </div>
    );
};

export default PaymentSuccess;