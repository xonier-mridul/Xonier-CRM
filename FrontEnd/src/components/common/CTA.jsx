import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

const CTA = ({ title, desc, btn }) => {
    return (
        <>
            <section className={` ${btn === 'Send Your Resume' ? 'pb-20' : 'py-20'} max-w-[1200px] mx-auto px-7`}>
                <div className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] rounded-[34px] py-16 px-8 md:px-16 text-center relative overflow-hidden shadow-[0_16px_40px_rgba(15,184,196,0.30)]">
                    <div className="absolute top-[-160px] left-[-80px] w-[360px] h-[360px] bg-white/10 rounded-full pointer-events-none" />
                    <div className="absolute bottom-[-140px] right-[-50px] w-[280px] h-[280px] bg-white/5 rounded-full pointer-events-none" />

                    <span className="font-sora text-3xl  md:text-4xl lg:text-5xl font-bold text-white max-w-2xl mx-auto relative z-10">
                        {title}
                    </span>
                    <p className="text-white/90 text-base md:text-lg max-w-xl mx-auto mb-8 mt-4 relative z-10">
                        {desc}
                    </p>
                    <div className="relative z-10 flex flex-wrap justify-center gap-4">
                        <Link onClick={() => window.scrollTo(0, 0)} to='/Paypal' className="inline-flex items-center gap-2 bg-white text-[#0fb8c4] font-semibold text-sm md:text-15px px-6 py-3 rounded-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg group">
                            {btn}
                            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </Link>
                    </div>
                </div>
            </section>
        </>
    )
}

export default CTA