import React, { useState } from "react";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const monthlyPlans = [
  {
    "id": 1,
    "name": "Starter",
    "description": "For individuals getting started",
    "price": 0,
    "currency": "$",
    "Billing": "Monthly",
    "period": "/month",
    "buttonText": "Get Started",
    "popular": false,
    "borderColor": "#E2E8F0",
    "features": [
      "Up to 3 Users",
      "1 Workspace",
      "Task Management",
      "Basic Dashboard",
      "Email Support"
    ]
  },
  {
    "id": 2,
    "name": "Pro",
    "description": "For small teams and startups",
    "price": 19,
    "oldPrice": 24,
    "currency": "$",
    "Billing": "Monthly",
    "period": "/month",
    "buttonText": "Start Free Trial",
    "popular": false,
    "borderColor": "#BFDBFE",
    "features": [
      "Up to 20 Users",
      "Lead & Sales Pipeline",
      "Advanced Dashboard",
      "Custom Reports",
      "Calendar & Reminders",
      "Priority Support"
    ]
  },
  {
    "id": 3,
    "name": "Business",
    "description": "For growing businesses",
    "price": 45,
    "oldPrice": 69,
    "Billing": "Monthly",
    "currency": "$",
    "period": "/month",
    "buttonText": "Start Free Trial",
    "popular": true,
    "badge": "MOST POPULAR",
    "borderColor": "#33bf8b",
    "features": [
      "Up to 50 Users",
      "Team Performance",
      "Revenue Tracking",
      "Automation Workflows",
      "Integrations",
      "Custom Roles & Permissions",
      "Dedicated Support"
    ]
  },
  {
    "id": 4,
    "name": "Enterprise",
    "description": "For large teams and organizations",
    "price": "Custom",
    "Billing": "Monthly",
    "period": "/month",
    "buttonText": "Contact Sales",
    "popular": false,
    "borderColor": "#DDD6FE",
    "features": [
      "Unlimited Users",
      "Advanced Security",
      "Custom Integrations",
      "SLA & Uptime Guarantee",
      "Dedicated Account Manager",
      "Onboarding & Training"
    ]
  }
]
const yearlyPlans = [
  {
    "id": 1,
    "name": "Starter",
    "description": "For individuals getting started",
    "price": 0,
    "currency": "$",
    "Billing": "Yearly",
    "period": "/year",
    "buttonText": "Get Started",
    "popular": false,
    "borderColor": "#E2E8F0",
    "features": [
      "Up to 3 Users",
      "1 Workspace",
      "Task Management",
      "Basic Dashboard",
      "Email Support"
    ]
  },
  {
    "id": 2,
    "name": "Pro",
    "description": "For small teams and startups",
    "price": 182.4,
    "oldPrice": 230.4,
    "currency": "$",
    "Billing": "Yearly",
    "period": "/year",
    "buttonText": "Start Free Trial",
    "popular": false,
    "borderColor": "#BFDBFE",
    "features": [
      "Up to 20 Users",
      "Lead & Sales Pipeline",
      "Advanced Dashboard",
      "Custom Reports",
      "Calendar & Reminders",
      "Priority Support"
    ]
  },
  {
    "id": 3,
    "name": "Business",
    "description": "For growing businesses",
    "price": 470.4,
    "oldPrice": 662.4,
    "currency": "$",
    "Billing": "Yearly",
    "period": "/year",
    "buttonText": "Start Free Trial",
    "popular": true,
    "badge": "MOST POPULAR",
    "borderColor": "#33bf8b",
    "features": [
      "Up to 100 Users",
      "Team Performance",
      "Revenue Tracking",
      "Automation Workflows",
      "Integrations",
      "Custom Roles & Permissions",
      "Dedicated Support"
    ]
  },
  {
    "id": 4,
    "name": "Enterprise",
    "description": "For large teams and organizations",
    "price": "Custom",
    "period": "/year",
    "Billing": "Yearly",
    "buttonText": "Contact Sales",
    "popular": false,
    "borderColor": "#DDD6FE",
    "features": [
      "Unlimited Users",
      "Advanced Security",
      "Custom Integrations",
      "SLA & Uptime Guarantee",
      "Dedicated Account Manager",
      "Onboarding & Training"
    ]
  }
]



const Plans = () => {
  const [active, setActive] = useState("monthly");

  const plans = active === "monthly" ? monthlyPlans : yearlyPlans;

  return (
    <section className="w-full py-20 bg-[#f8fafc]">
      <div className="max-w-7xl mx-auto px-4">


        <div className="flex justify-center mb-16">
          <div className="bg-white border border-slate-200 rounded-2xl p-1 flex">
            <button
              onClick={() => setActive("monthly")}
              className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${active === "monthly"
                ? "bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white"
                : "text-slate-600"
                }`}
            >
              Monthly
            </button>

            <button
              onClick={() => setActive("yearly")}
              className={`px-8 py-3 rounded-xl font-medium transition-all duration-300 ${active === "yearly"
                ? "bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white"
                : "text-slate-600"
                }`}
            >
              Yearly
            </button>
          </div>
        </div>


        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-3xl border p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-xl ${plan.popular
                ? "border-[#33bf8b] shadow-lg scale-105"
                : "border-slate-200"
                }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white text-xs px-4 py-2 rounded-full font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div>
                <h3 className="text-2xl font-bold text-slate-900">
                  {plan.name}
                </h3>

                <p className="text-slate-500 text-sm mt-2">
                  {plan.description}
                </p>

                <div className={`mt-8  ${plans === 'monthly' ? ' flex flex-row' : 'flex flex-col'}`}>
                  {plan.oldPrice && (
                    <span className="text-slate-400 line-through text-lg mr-2">
                      ${plan.oldPrice}
                    </span>
                  )}
                  <div>
                    <span className="text-5xl font-bold text-slate-900">
                      {typeof plan.price === "number"
                        ? `${plan.currency}${plan.price}`
                        : plan.price}
                    </span>

                    <span className="text-slate-500 ml-1">
                      {plan.period}
                    </span>
                  </div>


                </div>

                <Link to={plan.price === 'Custom' ? '/Form' : '/Payment'}
                  state={{ plan }}
                  onClick={() => scrollTo(0, 0)}>
                  <button
                    className={`w-full mt-8 py-3 rounded-xl font-medium transition-all ${plan.popular
                      ? "bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                  >
                    {plan.buttonText}
                  </button>

                </Link>


              </div>

              <div className="mt-8 border-t pt-6">
                <ul className="space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 text-slate-600"
                    >
                      <Check
                        size={18}
                        className="text-[#33bf8b] flex shrink-0"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
};

export default Plans;