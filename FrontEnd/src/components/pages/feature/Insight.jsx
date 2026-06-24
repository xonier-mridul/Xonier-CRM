
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { insightsData } from "../../../data/feature"
gsap.registerPlugin(ScrollTrigger)




const Insight = () => {


    const cardRef = useRef(null)
    const mainRef = useRef(null)
    useEffect(() => {
        gsap.fromTo('.left', {
            x: -50,
            opacity: 0,
        }, {
            x: 0,
            opacity: 1,
            duration: 1.2,
            scrollTrigger: {
                trigger: cardRef.current,
                start: 'top 80%',
                scroller: 'body',

            }
        });
        gsap.from('.rightN', {
            x: 50,
            opacity: 0,
            duration: 1.2,
            scrollTrigger: {
                trigger: cardRef.current,
                start: 'top 80%',
                scroller: 'body',

            }
        });

        gsap.from('.mainH', {
            y: 50,
            opacity: 0,
            scrub: true,
            stagger: 0.25,
            duration: 2,
            scrollTrigger: {
                trigger: mainRef.current,
                start: 'top 80%',
                scroller: 'body',

            }
        })


    }, [])

    return (
        <div className='w-full min-h-[80vh] py-20 overflow-auto bg-slate-100 px-4'>
            <div className="max-w-7xl h-full mx-auto px-4">
                <div
                    ref={mainRef}
                    className='flex flex-col justify-center items-center '>
                    <span className=" flex  items-center gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm mb-6 w-fit mainH">
                        <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse "></span>
                        Detailed Insights
                    </span>

                    <h2 className='text-[40px] font-[700] text-center mainH'>
                        Deep Insight For{' '}
                        <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">

                            Better Decision</span>
                    </h2>
                    <p className='max-w-150 text-center text-[16px] text-sm mt-[14px] text-[var(--ink-500)] mainH '>Dive deeper into your data and uncover insight that help you grow .</p>
                </div>

                <div
                    ref={cardRef}
                    className="w-full flex flex-col gap-6 mt-13">
                    {
                        insightsData.map((i) => {
                            return (
                                <div key={i.id} className="grid  lg:grid-cols-2 gap-4 md:gap-12 ">
                                    <div className="border border-slate-100 rounded-2xl bg-white/60 hover:bg-white left">
                                        <div className="flex items-center  flex-col md:flex-row gap-4 p-8">
                                            <div className="flex justify-center border border-slate-100  items-center h-12 w-[48px]  rounded-xl text-xl"
                                                style={{
                                                    backgroundColor: i.iconBg,
                                                    color: i.iconColor,
                                                    borderColor: i.iconBorder
                                                }}
                                            >{i.icon}
                                            </div>
                                            <div className="max-w-[80%] h-full flex flex-col items-centers lg:items-start justify-center ">
                                                <h3 className="text-[21px] mb-[10px] text-center lg:text-start">{i.title}</h3>
                                                <p className="text-[14.5px] lg:text-start text-center text-[var(--ink-500)]">{i.description}</p>
                                            </div>
                                        </div>

                                    </div>
                                    <div className=" rounded-2xl w-full h-full border border-slate-200 rightN">
                                        <img src={i.image} alt="image" className="w-full h-full rounded-2xl object-fill" />
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

export default Insight