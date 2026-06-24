import { useEffect, useRef } from 'react'

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { dashFeatureData } from '../../../data/feature';

gsap.registerPlugin(ScrollTrigger)


const DahFeature = () => {

    const dashRef = useRef(null)
    const boxRef = useRef(null)

    useEffect(() => {
        gsap.from('.boxs', {
            x: 50,
            opacity: 0,
            scrub: true,
            stagger: 0.25,
            duration: 2,
            scrollTrigger: {
                trigger: boxRef.current,
                start: 'top 80%',
                scroller: 'body',

            }
        });
        gsap.from('.mainHead', {
            y: 50,
            opacity: 0,
            scrub: true,
            stagger: 0.25,
            duration: 2,
            scrollTrigger: {
                trigger: dashRef.current,
                start: 'top 80%',
                scroller: 'body',

            }
        })


    }, [])
    return (
        <div className='w-full min-h-[80vh] pb-20 bg-green '>
            <div className='max-w-7xl h-full mx-auto grid gap-12 px-4 '>
                <div
                    ref={dashRef}
                    className='flex flex-col justify-center items-center '>
                    <span className=" flex  items-center gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm mb-[18px] w-fit  mainHead">
                        <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse  "></span>
                        DASHBOARD FEATURES
                    </span>

                    <h2 className='text-[40px] font-[700] text-center  mainHead'>
                        Everything you need at a{' '}
                        <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                            glance</span>
                    </h2>
                    <p className='max-w-150 text-center text-[16px] text-sm mt-[14px] text-[var(--ink-500)]  mainHead '>Our dashboard gives you a complete overview of your operations with powerful insights and intuitive visuals.</p>
                </div>

                <div
                    ref={boxRef}
                    className='grid md:grid-col-2 lg:grid-cols-3 gap-10'>
                    {
                        dashFeatureData.map((i) => {
                            return (
                                <div key={i.id} className='border relative h-[200px] overflow-hidden group  rounded-2xl justify-center items-center p-4 flex flex-col gap-6 boxs' style={{ borderColor: i.cardBorder }}>
                                    <div
                                        className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${i.cardGradient}`}
                                    />
                                    <div className='w-12 h-12 flex border rounded-xl
                                    transition-all duration-700  z-2 translate-y-4 group-hover:translate-y-0 group-hover:scale-105 justify-center items-center text-2xl'
                                        style={{
                                            backgroundColor: i.iconBg,
                                            borderColor: i.iconBorder,
                                            color: i.iconColor
                                        }}
                                    >

                                        {i.icon}
                                    </div>
                                    <div className='flex flex-col items-center '>
                                        <h3 className='text-[21px] mb-[10px] z-2 
                                        transition-all duration-700 
                                         translate-y-4
                                         group-hover:translate-y-0'>{i.title}</h3>
                                        <p className='text-[14.5px] text-center  opacity-0
                                            translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-700  text-[var(--ink-500)]'>{i.description}</p>
                                    </div>

                                </div>
                            )
                        })
                    }

                </div>

            </div>

        </div>
    )
}

export default DahFeature