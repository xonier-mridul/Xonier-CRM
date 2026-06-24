import { careersPageData } from '../../../data/careers'



const Why = () => {
    const data = careersPageData.values
    return (
        <div className='w-full min-h-[50vh] py-20'>
            <div className='max-w-7xl h-full mx-auto flex flex-col items-center px-4 '>
                <h2 className='text-[40px] font-[700] text-center md:text-start'>Why you'll love {' '}
                    <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                        working here
                    </span></h2>
                <p className='mt-[14px] text-[17px] text-[var(--ink-500)] text-center md:text-start'>We believes great people do their best work in he right environment </p>
                <div className='grid grid-cols-2 md:grid-cols-3 gap-8 mt-13'>
                    {
                        data.map((i) => {
                            return (
                                <div key={i.id} className='border relative border-slate-200 rounded-2xl px-6 py-10 group overflow-hidden flex flex-col  items-center gap-4'>
                                    <div className='w-[95%] h-full absolute top-0 right-0 bg-slate-100 rounded-l-full group-hover:translate-x-[100%]  transition-all duration-800 ' />
                                    <div className='w-[95%] h-full absolute top-0 left-0 bg-cyan-500 text-white rounded-r-full 
                                    transition-all duration-800
                                    group-hover:translate-x-0 -translate-x-[100%]' />
                                    <div className={`${i.color} w-12 h-12 rounded-2xl text-xl border flex z-1 justify-center items-center`}>
                                        <span className=''>{i.icon}</span>
                                    </div>
                                    <div className='z-1 group-hover:text-white flex flex-col justify-center   transition-all duration-800'>
                                        <span className='text-center font-[700]'>{i.title}</span>
                                        <p className='text-center text-[var(--ink-500)] group-hover:text-white mt-4'>{i.desc}</p>
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

export default Why