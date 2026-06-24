import React from 'react'
import { FaRegCreditCard } from 'react-icons/fa6'
import { TbShieldCheck } from "react-icons/tb";

const data = {
    "tag": "PRICING PLANS",
    "title": "Simple, Transparent Pricing for ",
    'title2': ' Every Growth Stage',
    "description": "Choose the perfect plan to track performance, manage tasks, and grow your business with Trakeroo.",
    "benefits": [
        {
            "icon": <FaRegCreditCard />,
            "title": "No Credit Card Required",
            "description": "Start your free trial instantly.",
            'color': 'bg-blue-100 border-blue-500 text-blue-500'

        },
        {
            "icon": <TbShieldCheck />,
            "title": "Cancel Anytime",
            "description": "No long-term contracts.",
            'color': 'bg-teal-100 border-teal-500 text-teal-500'
        }
    ]
}

const Hero = () => {
    return (
        <div className='w-full min-h-[70vh] py-20 bg-slate-100  relative'>
            <div className="absolute top-[-120px] right-[-160px] w-[520px] h-[520px] bg-radial-gradient from-[#34d6e0]/20 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(52, 214, 224, 0.22) 0%, transparent 65%)' }} />
            <div className="absolute bottom-[-120px] left-[-140px] w-[420px] h-[420px] bg-radial-gradient from-[#0fb8a5]/14 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(15, 184, 165, 0.14) 0%, transparent 65%)' }} />

            <div className='max-w-7xl h-full mx-auto flex flex-col gap-6 items-center text-center px-5  md:px-0 '>


                <span className=" flex items-center gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm  w-fit">
                    <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse " />
                    {data.tag}
                </span>

                <h2 className='text-4xl md:text-5xl font-bold'>
                    {data.title}<br />
                    <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                        {data.title2}
                    </span>
                </h2>
                <p className='text-[18px] text-[var(--ink-500)]'>{data.description}</p>
                <div className='flex gap-10 flex-col md:flex-row'>
                    {
                        data.benefits.map((i, ind) => (
                            <div key={ind} className='flex gap-5 border border-slate-200 p-4 bg-white/60 hover:bg-white rounded-2xl  items-center'>
                                <div className={`w-10 h-10 rounded-full border text-xl flex justify-center items-center ${i.color}`}>{i.icon}</div>
                                <div>
                                    <h3 className='text-[18px] text-start mb-[10px]'>{i.title}</h3>
                                    <p className='text-[14.5px] text-start text-[var(--ink-500)]'>{i.description}</p>
                                </div>


                            </div>
                        ))
                    }

                </div>




            </div>

        </div>
    )
}

export default Hero