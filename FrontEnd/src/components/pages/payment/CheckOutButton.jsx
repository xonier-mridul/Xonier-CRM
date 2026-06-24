
import { TiLockClosedOutline, TiTick } from "react-icons/ti";
import { BsShieldCheck } from "react-icons/bs";
import { PiGiftBold, PiHeadsetBold, PiShieldStarFill } from "react-icons/pi";
import { FaUsers } from "react-icons/fa6";
import { IoArrowForward, IoPricetag, IoShieldCheckmark } from "react-icons/io5";
import { LuRefreshCcw } from "react-icons/lu";

import visa from '../../../assets/visa.png';
import paypal from '../../../assets/paypal.png';
import american from '../../../assets/americanExpress.png';
import master from '../../../assets/Mastercard.png';
// import { useState } from "react";
// import { RxCross2 } from "react-icons/rx";
// import CheckoutForm from "../pages/payment/CheckoutForm";
import { Link, useLocation } from "react-router-dom";
import paymentServices from "../../../services/payment.services";







const data = {
  "brand": {
    "name": "Trakeroo",
    "tagline": "Secure checkout powered by PayPal",
    "logo": "/logo.svg"
  },
  "features": [
    {
      "title": "Fast & Secure Payments",
      "icon": <PiShieldStarFill />,
      color: 'bg-green-50 border-green-500 text-green-500',

    },
    {
      "title": "PayPal Buyer Protection",
      "icon": <BsShieldCheck />,
      color: 'bg-blue-50 border-blue-500 text-blue-500',

    },
    {
      "title": "SSL Encrypted",
      "icon": <TiLockClosedOutline />,
      color: 'bg-red-50 border-red-500 text-red-500',

    },
    {
      "title": "Trusted by 10,000+ Teams",
      "icon": <FaUsers />,
      color: 'bg-teal-50 border-teal-500 text-teal-500',


    }
  ],
  "plan": {
    "badge": "14-Day Free Trial",
    "name": "Trakeroo Pro Plan",
    "description": "Everything you need to scale your team",
    "price": 6,
    "currency": "$",
    "billingCycle": "month",
    icon: <TiTick />

  },
  "summary": {
    "plan": "Pro Plan",
    "billing": "Monthly",
    "subtotal": 6,
    "tax": 0,
    "totalToday": 0
  },
  "offer": {
    "title": "Start with a 14-day free trial",
    "description": "Cancel anytime. No charges until your trial ends.",
    icon: <PiGiftBold />
  },
  "benefits": [
    {
      "title": "Secure & Protected",
      "description": "Your payment information is encrypted and safe.",
      "icon": <IoShieldCheckmark />,
      color: 'bg-teal-100 border-teal-500 text-teal-500',


    },
    {
      "title": "Cancel Anytime",
      "description": "You can cancel your subscription at any time.",
      "icon": <LuRefreshCcw />,
      color: 'bg-blue-50 border-blue-500 text-blue-500',


    },
    {
      "title": "24/7 Support",
      "description": "Our support team is always available.",
      "icon": <PiHeadsetBold />,
      color: 'bg-red-50 border-red-500 text-red-500',


    }
  ],
  "paymentMethods": [
    {
      "type": "paypal",
      "label": "PayPal",
      "recommended": true
    },
    {
      "type": "paylater",
      "label": "Pay Later"
    },
    {
      "type": "card",
      "label": "Debit or Credit Card"
    }
  ],
  "acceptedCards": [
    { id: 1, img: visa },
    { id: 2, img: paypal },
    { id: 3, img: american },
    { id: 4, img: master },

  ],
  "security": {
    "icon": <BsShieldCheck />,

    "title": "PayPal Buyer Protection",
    "description": "Eligible purchases are covered by PayPal Buyer Protection."
  },
  "footer": {
    "terms": "/terms",
    "privacy": "/privacy",
    "badges": [
      "PayPal Secure Payments",
      "256-bit SSL Encryption",
      "Powered by PayPal"
    ]
  }
}


const CheckOutButton = () => {

  // const [showModal, setShowModel] = useState(false)
  const location = useLocation()

  const plan = location.state?.plan

 




  const handlePayment = async () => {
    try {
      const payload = {
        amount: plan.price,
        currency: "USD",
        description: plan.description,
        items: [
          {
            name: plan.name,
            quantity: 1,
            unit_amount: plan.price,
            description: plan.description,
          },
        ],
        return_url: `${window.location.origin}/payment/success`,
        cancel_url: `${window.location.origin}/payment/cancel`,
      };

      const response = await paymentServices.createOrder(payload);

      if (response.success) {
        window.location.href = response.data.approval_url;
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="w-full min-h-[90vh] py-20 bg-slate-100">

      {/* {showModal && (
        <div className="fixed inset-0 z-999 bg-black/50 backdrop-blur-xs flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-[450px]">
            <div className="flex justify-end ">
              <span onClick={() => setShowModel(false)} className="text-xl font-bold"><RxCross2 /></span>


            </div>
            <CheckoutForm Amount={plan.price} />


          </div>
        </div>
      )} */}


      <div className='max-w-7xl mx-auto px-4 '>
        <span className=" flex items-center gap-2 mb-9 justify-center text-[var(--ink-500)]"><TiLockClosedOutline className="text-2xl text-green-500" />
          Secured checkout powered by PayPal </span>
        <div className=" grid lg:grid-cols-4 grid-cols-2 justify-center">
          {data.features.map((i, ind) => {
            return (
              <div key={ind} className="flex gap-2 items-center w-fit py-2 px-5">
                <span className={`w-8 h-8 border rounded-full flex justify-center items-center ${i.color}`}>

                  <span className="text-xl">{i.icon}</span>
                </span>

                <span className="text-[14.5px] text-[var(--ink-500)]">{i.title}</span>


              </div>
            )
          })}
        </div>

        <div className="w-full grid lg:grid-cols-2 gap-5 mt-10 border border-slate-200 rounded-2xl bg-white/80">
          <div className="my-5 py-4 px-8">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-xl">Order Summary</h2>
              <span className="px-3 py-1.5 text-green-500 bg-green-100 rounded-xl text-sm">14-Day Free Trial</span>
            </div>
            <div className="flex gap-6 border border-slate-200 p-4 rounded-xl mt-5 text-[14.5px]">
              <div className="w-20 h-20 bg-green-100 text-green-500 flex justify-center items-center rounded-xl text-6xl">
                {data.plan.icon}
              </div>
              <div className="flex gap-2 flex-col">
                <h3 className="font-medium">{data.plan.name}</h3>
                <span className="text-[14.5px] text-[var(--ink-500)]">{data.plan.description}</span>

                <div className="text-[14.5px] text-[var(--ink-500)]">
                  <span>
                    {data.plan.currency}
                  </span>
                  <span>{data.plan.price}</span>
                  <span>/{data.plan.billingCycle} after trial</span>
                </div>


              </div>
            </div>
            {
              plan ? (
                <div className="px-5 text-[var(--ink-500)]">
                  <div className="flex justify-between mt-5 text-[14.5px] ">
                    <span>Plan</span>
                    <span>{plan ? plan.name : data.summary.plan}</span>
                  </div>
                  <div className="flex justify-between py-5 border-b border-slate-200 text-[14.5px] ">
                    <span>Billing</span>
                    <span>{plan ? plan.Billing : data.summary.billing}</span>
                  </div>
                  <div className="flex justify-between mt-5 text-[14.5px]">
                    <span>Subtotal</span>
                    <span>{plan ? plan.price : data.summary.subtotal}</span>
                  </div><div className="flex justify-between py-5 border-b border-slate-200 text-[14.5px]">
                    <span>Tax</span>
                    <span>{data.summary.tax} %</span>
                  </div>
                  <div className="flex justify-between mt-5 text-[14.5px]">
                    <span className="font-bold">Today's Total</span>
                    <span className="font-bold text-green-500">{data.plan.currency}{plan ? plan.price : data.summary.totalToday}</span>
                  </div>


                </div>

              ) : (<div className="w-full min-h-10 py-10 flex justify-center">
                <Link
                  to='/Pricing'>
                  <button className="px-6 py-4 rounded-4xl font-bold btn-primary group flex gap-1 items-center">
                    Select your plan
                    <IoArrowForward className='text-lg group-hover:translate-x-1 transition-all duration-200 translate-x-0' />
                  </button>
                </Link>

              </div>)
            }

            <div className="flex gap-6 border border-slate-200 p-4 rounded-xl mt-5">
              <div className="w-20 h-20 bg-green-100 text-green-500 flex justify-center items-center rounded-xl text-6xl">
                {data.offer.icon}
              </div>
              <div className="flex gap-2 flex-col justify-center">
                <h3 className="font-medium text-[16px]">{data.offer.title}</h3>
                <span className="text-[14.5px]">{data.offer.description}</span>
              </div>
            </div>

            <div className="mt-5">
              {
                data.benefits.map((i, ind) => {
                  return (
                    <div key={ind}
                      className="flex gap-6 p-4">
                      <div className={`w-10 h-10 bg-green-100 text-green-500 flex justify-center items-center rounded-full text-xl ${i.color}`}>
                        {i.icon}
                      </div>
                      <div className="flex gap-2 flex-col justify-center">
                        <h3 className="font-medium text-[16px]">{i.title}</h3>
                        <span className="text-[14.5px] text-[var(--ink-500)]">{i.description}</span>



                      </div>
                    </div>
                  )
                })
              }
            </div>




          </div>

          <div className=" py-4 px-8 flex flex-col justify-between gap-6 border-l border-slate-200 my-5">
            <div>
              <h2 className="font-bold text-xl">Choose your payment method</h2>

              <div className="flex gap-6 border border-slate-200 p-4 rounded-xl mt-5">
                <div className="w-20 h-20 bg-green-100 text-green-500 flex justify-center items-center rounded-xl text-6xl">
                  <IoPricetag />

                </div>
                <div className="flex gap-2 flex-col justify-center">
                  <h3 className="font-medium text-[16px]">You won't be charged today </h3>
                  <span className="text-[14.5px] text-[var(--ink-500)]">Your 14-day free trial started now.</span>
                </div>
              </div>

            </div>

            <div className="relative z-0 my-5">


              <button
                onClick={handlePayment}
                disabled={!plan}
                className={`w-full h-[50px] rounded-sm font-bold 
                ${plan
                    ? "bg-black text-white"
                    : "bg-black/50 text-white/50 cursor-not-allowed"
                  }`}
              >
                Pay with PayPal
              </button>


            </div>
            <div>

              <div className="relative">
                <div className="text-[14.5px] flex justify-center   bg-white z-2">
                  <span className="bg-white z-10 px-2 text-[14.5px] text-[var(--ink-500)]">We accept</span>
                </div>
                <div className="absolute top-3 left-0 h-[1px] w-full bg-slate-200" />
                <div className="flex gap-8 my-5 justify-center">
                  {
                    data.acceptedCards.map((i) => {

                      return (
                        <div key={i.id} className="w-20 h-10 border border-slate-200 overflow-hidden rounded-lg ">
                          <img src={i.img} alt="img" className="w-full h-full object-fill" />

                        </div>
                      )
                    }

                    )
                  }
                </div>
              </div>

              <div className="flex gap-6 border border-slate-200 p-4 rounded-xl mt-10">
                <div className="w-20 h-20 bg-green-100 text-green-500 flex justify-center items-center rounded-xl text-6xl">
                  {data.security.icon}

                </div>
                <div className="flex gap-2 flex-col justify-center">
                  <h3 className="font-medium text-[16px]">{data.security.title} </h3>
                  <span className="text-[14.5px] text-[var(--ink-500)]">{data.security.description}.</span>
                </div>
              </div>
            </div>



          </div>
        </div>



      </div>
    </div>

  )
}

export default CheckOutButton