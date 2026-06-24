
export const  RequestItem ={
    name:'',
    quantity:0,
    unit_amount:0,
    description:''
}


export const CreateOrderRequest= {
    amount: 0,
    currency: '',
    description:'',
    items:RequestItem,
    return_url:'',
    cancel_url:''

}

export const capturePaymentRequest ={
    payer_id : ''
}