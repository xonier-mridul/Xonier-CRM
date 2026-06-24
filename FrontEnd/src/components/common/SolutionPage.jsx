import React, { useEffect, useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SolutionData } from '../../data/solution'

gsap.registerPlugin(ScrollTrigger)

const SolutionPage = () => {

    const feaRef = useRef(null)
    const benRef = useRef(null)
    const { slug, top } = useParams()

    useLayoutEffect(() => {
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());

        gsap.fromTo('.main', {
            y: 50,
            opacity: 0,
        }, {
            y: 0,
            opacity: 1,

            stagger: 0.25,
            ease: 'power3.inOut',
            duration: 2,
        })



        gsap.fromTo(
            ".fea",
            {
                y: 50,
                opacity: 0,
            },
            {
                y: 0,
                opacity: 1,
                duration: 2,
                ease: "power2.out",
                stagger: 0.25,
                scrollTrigger: {
                    trigger: feaRef.current,
                    start: "top 80%",
                },

            }

        );

        gsap.fromTo(
            ".ben",
            {
                y: 50,
                opacity: 0,
            },
            {
                y: 0,
                opacity: 1,
                duration: 1,
                stagger: 0.25,
                ease: "power2.out",
                scrollTrigger: {
                    trigger: benRef.current,
                    start: "top 80%",
                    scroller: 'body'
                },

            }

        );

    }, [slug]);





    console.log('top: ', top)
    console.log('slug: ', slug)


    const currentPage = SolutionData.find(i => i.top === top)
    console.log('curr :', currentPage)


    const singlePage = currentPage.items.find(item => item.slug === slug)
    console.log('single :', singlePage)

    if (!singlePage) {
        return (
            <div className='min-h-screen flex items-center justify-center'>
                <h1 className='text-4xl font-bold'>
                    Page Not Found
                </h1>
            </div>
        )
    }




    return (
        <section className='w-full min-h-screen bg-[#f8fbfd] '>
            <div className='w-full mx-auto min-h-[70vh] relative flex flex-col justify-center py-20 items-center bg-gradient-to-b from-[#f1f6fb] to-[#eaf3f9]'>
                <div className="absolute top-[-120px] right-[-160px] w-[520px] h-[520px] bg-radial-gradient from-[#34d6e0]/20 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(52, 214, 224, 0.22) 0%, transparent 65%)' }} />
                <div className="absolute bottom-[-120px] left-[-140px] w-[420px] h-[420px] bg-radial-gradient from-[#0fb8a5]/14 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(15, 184, 165, 0.14) 0%, transparent 65%)' }} />

                <span className='px-4 py-2 rounded-full bg-white text-[#0fb8c4]  text-sm font-semibold flex gap-2 items-center main'>
                    <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse"></span>

                    {singlePage?.hero?.badge}
                </span>

                <h1 className='text-4xl lg:text-5xl font-bold text-[#043264] mt-6 max-w-[800px]  leading-tight px-20 text-center capitalize main'>
                    {singlePage?.hero?.title}{' '}
                    <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">{singlePage?.hero?.title2}</span>

                </h1>

                <p className='text-slate-600 text-lg mt-5 max-w-3xl text-center leading-relaxed main'>
                    {singlePage?.hero?.desc}
                </p>
                {/* <img src={singlePage.hero.image} alt='image.jpg'/> */}
            </div>

            <div className='max-w-7xl mx-auto px-5'>


                <div
                    ref={feaRef}
                    className='grid md:grid-cols-2 gap-10 py-20'>
                    <div className='flex justify-center px-2 py-2 relative items-center md:col-span-2 text-4xl font-bold text-[#043264]'>FEATURES
                        <div className='h-1 w-20 bg-linear-to-r from-[#16c2cf] to-[#0fb8a5]  rounded-full absolute bottom-0 '></div>
                    </div>


                    {
                        singlePage?.features?.map((feature, index) => (

                            <div
                                key={index}
                                className='bg-slate-100 border border-slate-200 rounded-2xl group px-9 py-6 flex flex-col transition-all duration-200 relative hover:scale-105 items-center gap-6 overflow-hidden fea'
                            >
                                <div className="absolute top-[-120px] right-0  w-[520px] h-[520px] bg-radial-gradient from-[#34d6e0] to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(52, 214, 224, 0.22) 0%, transparent 65%)' }} />

                                <div className='w-24 h-24 rounded-full group-hover:scale-115 transition-all duration-200 bg-white flex justify-center items-center z-3'>
                                    <span className='flex justify-center items-center text-5xl'>{feature.icon}</span>

                                </div>
                                <div className=''>
                                    <h2 className=' text-center text-lg font-bold text-[#043264]'>
                                        {feature.title}
                                    </h2>

                                    <p className='text-slate-600 text-sm max-w-[400px] text-center mt-3'>
                                        {feature.desc}
                                    </p>
                                </div>


                            </div>

                        ))
                    }

                </div>

                {/* BENEFITS */}

                <div
                    ref={benRef}
                    className=''>

                    <h2 className='text-4xl relative font-bold text-[#043264] py-2 flex justify-center items-center ben'>
                        BENEFITS
                        <div className='h-1 w-20 bg-linear-to-r from-[#16c2cf] to-[#0fb8a5]  rounded-full absolute bottom-0 '></div>
                    </h2>

                    <div className='grid md:grid-cols-2 gap-10 mt-8'>

                        {
                            singlePage?.benefits?.map((benefit, index) => (

                                <div
                                    key={index}
                                    className='bg-slate-100  border border-slate-200 rounded-2xl group px-9 py-6 flex flex-col transition-all relative duration-200 hover:scale-105 items-center gap-6 overflow-hidden ben'
                                >
                                    <div className="absolute top-[-120px] right-0 w-[520px] h-[520px] bg-radial-gradient from-[#34d6e0]/20 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(52, 214, 224, 0.22) 0%, transparent 65%)' }} />
                                    <div className='w-24 h-24 rounded-full bg-white flex justify-center group-hover:scale-115 transition-all duration-200 items-center z-2'>
                                        <span className='flex justify-center items-center text-5xl'>{benefit.icon}</span>

                                    </div>
                                    <div>
                                        <h2 className='text-lg text-center font-bold text-[#043264]'>
                                            {benefit.title}
                                        </h2>

                                        <p className='text-slate-600 text-sm max-w-[400px] text-center mt-3'>
                                            {benefit.desc}
                                        </p>
                                    </div>


                                </div>

                            ))
                        }

                    </div>

                </div>

                {/* STATS */}

                <div className='grid md:grid-cols-3 gap-6 my-20'>

                    {
                        singlePage?.stats?.map((stat, index) => (

                            <div
                                key={index}
                                className='bg-cyan-500 text-white rounded-3xl p-8'
                            >

                                <span className='text-5xl text-white flex justify-center font-bold'>
                                    {stat.number}
                                </span>

                                <p className='mt-3 text-lg text-center'>
                                    {stat.label}
                                </p>

                            </div>

                        ))
                    }

                </div>

            </div>

        </section>
    )
}

export default SolutionPage