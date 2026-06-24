import React, { useEffect, useRef, useState } from 'react'
import Counter from '../../common/Counter'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const Stats = () => {
    const [start, setStart] = useState(false)

    const startRef = useRef(null)

    useEffect(() => {
        ScrollTrigger.create({
            trigger: startRef.current,
            start: 'top 80%',
            once: true,
            onEnter: () => setStart(true)
        })

    }, [])


    return (
        <>
            <section className="max-w-[1200px] mx-auto px-7 -mt-12 relative z-20">
                <div className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] rounded-3xl p-8 md:p-12 shadow-[0_16px_40px_rgba(15,184,196,0.30)] relative overflow-hidden text-white grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div
                        ref={startRef}
                        className="absolute top-[-120px] right-[-60px] w-[300px] h-[300px] bg-white/10 rounded-full pointer-events-none" />

                    <div className="relative">
                        <div className="font-sora text-3xl md:text-4xl font-extrabold">
                            <Counter end={2022} start={start} /></div>
                        <div className="text-sm opacity-90 mt-2">Founded</div>
                    </div>
                    <div className="relative border-l border-white/20">
                        <div className="font-sora text-3xl md:text-4xl font-extrabold">
                            <Counter end={30} start={start} />+</div>
                        <div className="text-sm opacity-90 mt-2">Remote Builders</div>
                    </div>
                    <div className="relative border-l-0 md:border-l border-white/20">
                        <div className="font-sora text-3xl md:text-4xl font-extrabold">
                            <Counter end={120} start={start} />+</div>
                        <div className="text-sm opacity-90 mt-2">Countries Served</div>
                    </div>
                    <div className="relative border-l border-white/20">
                        <div className="font-sora text-3xl md:text-4xl font-extrabold">
                            <Counter end={50} start={start} />k+</div>
                        <div className="text-sm opacity-90 mt-2">Daily Active Tasks</div>
                    </div>
                </div>
            </section>
        </>
    )
}

export default Stats