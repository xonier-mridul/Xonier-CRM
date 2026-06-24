import Hero from '../../components/pages/blogs/Hero'
import Left from '../../components/pages/blogs/Left'
import Right from '../../components/pages/blogs/Right'

const Blogs = () => {
    return (
        <>
            <Hero />
            <div className='w-full min-h-[50vh] py-20'>
                <div className='max-w-7xl h-full mx-auto grid grid-cols-3 gap-10'>
                    <div className='col-span-2'>
                        <Left />
                    </div>
                    <div className='col-span-1'>
                        <Right />
                    </div>

                </div>

            </div>
        </>
    )
}

export default Blogs