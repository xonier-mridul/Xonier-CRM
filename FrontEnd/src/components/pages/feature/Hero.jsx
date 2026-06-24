
import dashboard from '../../../assets/dashboardss.png'
import acc from '../../../assets/03-1.png'
import gsap from 'gsap';
import { heroData } from '../../../data/feature';
import { useEffect } from 'react';






const Hero = () => {

    useEffect(() => {
        gsap.to(
            '.box',
            {
                y: 20,
                duration: 2,
                yoyo: true,
                repeat: -1,
                ease: "power2.inOut"

            }


        )

        gsap.fromTo(
            '.right', {
            x: 50
        },

            {
                x: 0,
                opacity: 1,
                duration: 1.5,
                ease: "power3.out",
                once: true
            }
        );

        gsap.fromTo(
            '.left', {
            x: -50
        },

            {
                x: 0,
                opacity: 1,
                duration: 1.5,
                ease: "power3.out",
                overwrite: "auto",
            }
        );

    }, [])
    return (
        <div className='w-full min-h-[90vh] relative py-20 px-4'>

            {/* <div className='absolute right-[20%] top-[15%] h-100 w-100 rounded-full z-10 opacity-20 bg-linear-to-r from-cyan-600 to-emerald-400'></div> */}
            <div className='absolute hidden md:block  h-155 w-125 z-0 right-0 top-5 opacity-60 rounded-l-full bg-linear-150 from-[#1ba2c3] to-[#2ca679]'></div>

            <div className='max-w-7xl mx-auto h-full  flex flex-col lg:flex-row justify-between gap-10  lg:gap-0 px-4 '>
                <div className='w-full lg:w-[42%] flex flex-col  lg:items-start items-center left'>
                    <span className=" flex  items-center gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse  "></span>
                        Feature
                    </span>

                    <h2 className=' text-4xl lg:text-5xl font-bold text-center lg:text-start mb-4'>
                        Powerful Dashboard{' '}
                        <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                            Complete Overview
                        </span>
                    </h2>
                    <p className='text-[16px] text-[var(--ink-500)] text-center lg:text-start'>Get 360<sup>o</sup>{' '} view of your business operations in one place.
                        Track performance, manage teams, and make data-driven decision with ease.</p>

                    <div className='flex flex-col gap-2 mt-4 ' >
                        {
                            heroData.map((i) => {
                                return (
                                    <div className='flex gap-4 items-center'>
                                        <div className={`h-9 w-9 rounded-full flex justify-center items-center ${i.color}`}>
                                            <span className='text-lg'>{i.icon}</span></div>
                                        <div className='text-[16px] text-[var(--ink-500)]'>{i.head}</div>

                                    </div>
                                )
                            })
                        }

                    </div>



                </div>
                <div className='w-full lg:w-[53%] relative z-2 flex items-center right'>
                    <div className={`absolute h-12  bottom-[-20px] lg:bottom-[20px] md:h-15 z-0 rounded-2xl overflow-hidden left-[20px] lg:left-[-50px] shadow-[0px_0px_12px_#00000020] hover:shadow-[0px_0px_18px_#00000025] box`}
                    >
                        <img src={acc} alt='icon' className='w-full h-full object-cover' />
                    </div>
                    <div className='w-full h-[80%] md:h-[90%] px-4 lg:px-0  rounded-2xl shadow-[0px_0px_12px_#00000020] hover:shadow-[0px_0px_18px_#00000025] overflow-hidden'>
                        <img src={dashboard} alt='dashboard' className='w-full h-full object-fill object-fill' />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Hero