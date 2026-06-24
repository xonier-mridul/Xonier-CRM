import { Link } from 'react-router-dom'
import heroimg1 from '../../../assets/bg1.webp'
import { careersPageData } from '../../../data/careers'

const Hero = () => {
    const hero = careersPageData.hero
    return (
        <div className='w-full min-h-[70vh] py-20 relative  bg-gradient-to-b from-[#f1f6fb] to-[#eaf3f9]'>
            <div className="absolute top-[-120px] right-[-160px] w-[520px] h-[520px] bg-radial-gradient from-[#34d6e0]/20 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(52, 214, 224, 0.22) 0%, transparent 65%)' }} />
            <div className="absolute bottom-[-120px] left-[-140px] w-[420px] h-[420px] bg-radial-gradient from-[#0fb8a5]/14 to-transparent rounded-full pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(15, 184, 165, 0.14) 0%, transparent 65%)' }} />
            <div className='max-w-7xl mx-auto h-full grid grid-cols-1 gap-8 px-4  md:grid-cols-2'>
                <div className='w-full h-full'>
                    {<>
                        <div className='flex justify-center md:justify-start'> <span className=" flex  items-center w-fit gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm mb-6 new " >
                            <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse"></span>
                            {hero.badge}
                        </span>

                        </div>

                        <h1 className="font-sora text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#15233b] tracking-tight max-w-4xl mx-auto leading-[1.15] mb-6 new text-center md:text-start ">
                            {hero.title}
                            <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent ">
                                {hero.title2}</span>
                        </h1>
                        <p className="text-lg md:text-xl text-[#5a6b86] max-w-2xl mx-auto text-center md:text-start  leading-relaxed new">
                            {hero.desc}

                        </p>
                        <div className="nav-cta mt-7 flex gap-2 justify-center md:justify-start ">
                            <Link to='/Form' className="btn btn-ghost"
                                onClick={() => window.scrollTo(0, 0)}>{hero.secondaryBtn}</Link>
                            <Link
                                onClick={() => scrollTo(0, 0)}
                                to='/PayPal' className="btn btn-primary">{hero.primaryBtn}
                                <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                            </Link>
                        </div>

                    </>
                    }
                </div>
                <div className=' justify-center hidden md:flex items-center '>
                    <div className='w-[400px] relative h-[90%] bg-gradient-to-b   from-[#16c2cf] to-[#0fb8a5] rounded-b-2xl  rounded-tl-full rounded-tr-full '>
                        <img src={heroimg1} alt='image' className='absolute bottom-0 w-[400px]' />
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Hero