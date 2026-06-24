import gsap from 'gsap'
import React, { useEffect } from 'react'

const Hero = () => {
    useEffect(() => {
        gsap.fromTo('.new', {
            y: 50,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power2.inOut',
                duration: 1

            }
        )

    }, [])
    return (
        <>
            <section className="relative w-full min-h-[60vh]  overflow-hidden bg-gradient-to-b from-[#f1f6fb] to-[#eaf3f9] pt-20 pb-24 lg:pt-28 lg:pb-36 ">
                {/* Radial Background Glow effects matching the landing page */}
                <div className="absolute top-[-120px] right-[-160px] w-[520px] h-[520px] bg-radial-gradient from-[#34d6e0]/20 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(52, 214, 224, 0.22) 0%, transparent 65%)' }} />
                <div className="absolute bottom-[-120px] left-[-140px] w-[420px] h-[420px] bg-radial-gradient from-[#0fb8a5]/14 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(15, 184, 165, 0.14) 0%, transparent 65%)' }} />

                <div className="max-w-[1200px] mx-auto px-7  text-center relative z-10 flex flex-col items-center justify-center ">
                    <span className=" flex  items-center gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm mb-6 new">
                        <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse"></span>
                        Our Mission
                    </span>
                    <h1 className="font-sora text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#15233b] tracking-tight max-w-4xl mx-auto leading-[1.15] mb-6 new">
                        We are here to unify how the{' '}
                        <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">world works together.</span>
                    </h1>
                    <p className="text-lg md:text-xl text-[#5a6b86] max-w-2xl mx-auto leading-relaxed new">
                        Trakeroo was built on a simple observation: teams shift context too much. We believe that by marrying engineering tasks, sales pipelines, and customer support, companies unlock unstoppable momentum.
                    </p>
                </div>
            </section>
        </>
    )
}

export default Hero