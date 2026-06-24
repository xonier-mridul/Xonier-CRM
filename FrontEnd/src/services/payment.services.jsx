import api from '../api/api'



const paymentServices = {
    createOrder: (payload) => api.post('/payments/create-order', payload),
    capturePayment: (orderId, payerId) => api.post(`/payments/capture/${orderId}`, {
        payer_id: payerId
    })

}

export default paymentServices