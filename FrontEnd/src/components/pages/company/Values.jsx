import gsap from 'gsap';
import { Heart, ShieldCheck, Target } from 'lucide-react';
import React, { useEffect, useRef } from 'react'

const values = [
    {
        icon: <Target className="w-6 h-6 text-[#0fb8c4]" />,
        title: "Radical Transparency",
        description: "We believe work shouldn't be siloed. By creating a unified workspace, we bring clarity, eliminate second-guessing, and empower teams to see their true impact."
    },
    {
        icon: <Heart className="w-6 h-6 text-[#e87f3e]" />,
        title: "Customer-First Craftsmanship",
        description: "We design every pixel and line of code with intentionality. If it doesn't make a customer's workday simpler, faster, and more delightful, it doesn't belong."
    },
    {
        icon: <ShieldCheck className="w-6 h-6 text-[#7c5cff]" />,
        title: "Built on Trust",
        description: "Security and reliability are non-negotiable. Hundreds of global teams trust us with their operational data, a responsibility we protect fiercely every single day."
    }
];

const Values = () => {
    const coreRef = useRef(null)

    useEffect(() => {
        gsap.fromTo('.new2', {
            y: 60,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power2.inOut',
                duration: 1,
                scrollTrigger: {
                    trigger: coreRef.current,
                    start: 'top 80%'
                }

            }
        )
    })
    return (
        <div className='w-full min-h-[50vh]'>
            <div className="py-20 max-w-7xl  mx-auto h-full  px-4">
                <div
                    ref={coreRef}
                    className="text-center  mb-16">
                    <span className="inline-block bg-white border border-[#e3ebf2] rounded-full px-4 py-1.5 text-xs font-semibold text-[#0fb8c4] shadow-sm tracking-wide mb-4 new2">
                        Core Beliefs
                    </span>
                    <h2 className="font-sora text-3xl md:text-4xl font-bold text-[#15233b] new2">
                        Values that code <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">our culture.</span>
                    </h2>
                    <p className="mt-3 text-base text-[#5a6b86] new2">
                        We operate transparently, test obsessively, and design purposefully.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {values.map((val, i) => (
                        <div key={i} className="bg-white border border-[#e3ebf2] rounded-[22px] p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_18px_50px_rgba(21,35,59,0.10)] relative overflow-hidden group new2">
                            <div className="w-[54px] h-[54px] rounded-2xl flex items-center justify-center mb-6 bg-[#f1f6fb] group-hover:scale-110 transition-transform duration-300">
                                {val.icon}
                            </div>
                            <h3 className="font-sora text-xl font-bold text-[#15233b] mb-3">{val.title}</h3>
                            <p className="text-sm text-[#5a6b86] leading-relaxed">{val.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Values