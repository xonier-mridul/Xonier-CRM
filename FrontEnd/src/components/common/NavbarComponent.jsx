import { Link } from 'react-router-dom'
import { IoMdArrowDropdown } from 'react-icons/io'
import { TbXboxX } from 'react-icons/tb'
import { SolutionData } from '../../data/solution'
import logo from '../../assets/trakeroo.webp'


const NavbarComponent = ({ handleClick, active, setActive, drop, setDrop }) => {
    const handleSolutionClick = () => {
        setDrop(!drop)
    }
    const handelMinClick = () => {
        setDrop(!drop)
        window.scrollTo(0, 0)
        setActive(!active)

    }

    return (
        <div className='w-full min-h-[130vh]'>
            <div className={`${active ? ' absolute  top-0 text-slate-500 overflow-y-scroll w-full h-full bg-white flex flex-col  p-6 transition-all duration-700 translate-x-0' : 'translate-x-200 '}   `} >
                <div className='flex justify-between items-center px-4'>
                    <Link to='/'>
                        <div className='h-10 ' onClick={handleClick}>
                            <img src={logo} alt='logo' className='w-full h-full object-cover' />
                        </div>
                    </Link>
                    <span className='text-3xl text-cyan-600 flex justify-end' onClick={() => {
                        setActive(false),
                            setDrop(false)

                    }}><TbXboxX /></span>
                </div>




                <Link className='py-5 mt-5 group font-[500]   border-t border-slate-200  hover:text-blue-500 text-[16px] px-4' to='/' onClick={handleClick}>
                    <span className='group-hover:text-blue-500'>
                        Home
                    </span>
                </Link>
                <Link className='  py-5 group text-[16px] px-4  ' to='/Feature'
                    onClick={handleClick}>
                    <span className='group-hover:text-blue-500'>
                        Feature
                    </span></Link>

                <span className="group relative flex gap-1  group py-5 px-4 text-[16px] cursor-pointer hover:text-blue-500 transition-all duration-700"
                    onClick={handleSolutionClick} >
                    <span className='group-hover:text-blue-500 flex items-center gap-1 '>
                        Solution
                        <IoMdArrowDropdown className={` ${drop ? 'text-lg transition-transform duration-400 rotate-180' : 'text-lg'}`} />
                    </span>



                    {/* Dropdown */}
                    {/* <div className="absolute top-20 right-0  bg-white flex gap-5 shadow-xl rounded-2xl p-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-100">
                        {
                            SolutionData.map((i) => (
                                <DropDown key={i.id} top={i.top} title={i.title} items={i.items} />
                            ))
                        }
                    </div> */}



                </span>
                <div className='grid grid-cols-2'>


                    {
                        drop &&
                        (
                            SolutionData.map((i) => {
                                return (
                                    <div key={i.id} className=''>
                                        <div className="group relative flex flex-col gap-1 py-3 group px-4  text-[16px]   cursor-pointer"
                                        >
                                            <div className='flex'>
                                                <span className='px-2 underline py-2' >
                                                    {i.title}
                                                </span>


                                            </div>
                                            <div>
                                                {
                                                    i.items.map((item) => {
                                                        return (
                                                            <Link to={`/Solution/${i.top}/${item.slug}`}
                                                                onClick={handelMinClick}>

                                                                <span key={item.id} className="group relative grid grid-cols-2 gap-1 py-4 group p-2 text-sm    cursor-pointer hover:text-blue-500 whitespace-nowrap"
                                                                >
                                                                    {item.head}

                                                                </span>
                                                            </Link>




                                                        )
                                                    })



                                                }

                                            </div>



                                        </div>





                                    </div>
                                )
                            })
                        )
                    }
                </div>


                <Link className=' py-5  px-4 group   text-[16px]  ' to='/Pricing'
                    onClick={handleClick}>
                    <span className='group-hover:text-blue-500' >
                        Pricing
                    </span></Link>
                <Link
                    className=' group py-5 border-b px-4 border-slate-200   text-[16px]   '
                    to='/Company'
                    onClick={handleClick}>
                    <span className='group-hover:text-blue-500' >
                        Company
                    </span></Link>

                <div className="flex py-5 md:py-0 gap-8">
                    <Link to='/Form' className="btn btn-ghost"
                        onClick={handleClick}>Get a demo</Link>
                    <Link
                        onClick={handleClick}
                        to='/PayPal' className="btn btn-primary">Get Started
                        <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                    </Link>
                </div>
            </div>

        </div>
    )
}

export default NavbarComponent