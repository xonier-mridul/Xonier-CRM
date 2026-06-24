import React from 'react'
import { careersPageData } from '../../../data/careers'
import { CiLocationOn } from "react-icons/ci";
import { PiToolboxLight } from "react-icons/pi";
import bg2 from '../../../assets/bg2.png'
import { FaCheck } from 'react-icons/fa';
import { Link } from 'react-router-dom';


const Open = () => {
    const data = careersPageData.openings
    const right = careersPageData.lifeAtTrackeroo
    return (
        <div className='w-full min-h-[80vh] py-20 '>
            <div className='max-w-7xl h-full mx-auto grid grid-cols-3 gap-12 px-4'>
                <div className='col-span-3 md:col-span-2'>
                    <div>
                        <h2 className='text-[40px] font-[700] '>Open {' '}
                            <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                                Positions
                            </span></h2>
                        <p className='mt-[14px] text-[17px] text-[var(--ink-500)]'>Join our team and help us building the future of work </p>


                        <div className='grid gap-4 mt-10'>
                            {
                                data.map((i, ind) => {
                                    return (
                                        <div key={ind} className='border border-slate-100 p-4  grid grid-cols-6 rounded-2xl
                                        '>
                                            <div className='flex justify-center items-center '>
                                                <span className={`text-2xl w-10 h-10 rounded-2xl border  flex justify-center items-center ${i.color}`}>{i.icon}</span></div>
                                            <div className='flex gap-2 col-span-2'>

                                                <div className='flex flex-col justify-center gap-2 '>
                                                    <h3>{i.title}</h3>
                                                    <p className='text-[14.5px]'><span className={`w-2 h-2 rounded-full bg-[#16c2cf] text-[14.5px] animate-pulse`}></span>{i.department}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className='flex flex-col md:flex-row gap-4 justify-center col-span-2'>
                                                <span className='flex justify-center items-center gap-1'><CiLocationOn />
                                                    <span className='text-[14.5px]'>
                                                        {i.location}
                                                    </span>
                                                </span>
                                                <span className='flex justify-center items-center gap-1 '><PiToolboxLight />
                                                    <span className='text-[14.5px]'>
                                                        {i.type}

                                                    </span>
                                                </span>
                                            </div>
                                            <div className='flex justify-center items-center'>
                                                <Link to={`/Career/${i.slug}`}
                                                    onClick={() => window.scrollTo(0, 0)}
                                                    className='px-4 py-2 border bg-slate-50 border-slate-200 rounded-2xl text-[14.5px]'>View Details</Link></div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
                <div className=' bg-slate-50 hidden md:flex flex-col col-span-1 rounded-2xl px-5 py-6'>
                    <h2 className='font-[700] text-[20px]'>{right.title}</h2>
                    <p className='mt-4'>{right.desc}</p>
                    <ul className="space-y-2 mt-4">
                        {right.points.map((i, index) => (
                            <li
                                key={index}
                                className="flex items-center gap-3 text-[#043264]"
                            >
                                <span className=" text-[#1ba2c3]"><FaCheck /></span>
                                {i}
                            </li>
                        ))}
                    </ul>
                    <img src={bg2} alt='image' />

                </div>


            </div>
        </div>
    )
}

export default Open