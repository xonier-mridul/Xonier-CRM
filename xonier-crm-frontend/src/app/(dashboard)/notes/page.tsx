"use client"
import { SIDEBAR_WIDTH } from '@/src/constants/constants'
import React, { JSX, useState } from 'react'
import { TbNotes } from "react-icons/tb";
import { FaRegStar } from "react-icons/fa";

enum ACTIVE {
  ALL = "all",
  IMPORTANT = "important"}

const page = ():JSX.Element => {
  const [active, setActive] = useState<ACTIVE>(ACTIVE.ALL);



  const handleActive = (val:ACTIVE)=>{
     setActive(val)
  }
  return (
    <div className={`ml-72 mt-14 p-6`}>
      <div className='flex w-full flex-col gap-3'>
        <h2 className='text-slate-900 dark:text-white font-medium text-4xl'>Notes</h2>
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center justify-between gap-4'>
        <ul className='flex items-center gap-4'>
          <li className={`${(active === ACTIVE.ALL) ? "bg-blue-700 text-white": "bg-transparent text-black"} px-5 py-2 cursor-pointer flex items-center gap-2 capitalize rounded-lg`} onClick={()=>handleActive(ACTIVE.ALL)}>All notes <TbNotes /></li>
          <li className={`${(active === ACTIVE.IMPORTANT) ? "bg-blue-700 text-white": "bg-transparent text-black"} px-5 py-2 cursor-pointer flex items-center gap-2 capitalize rounded-lg`} onClick={()=>handleActive(ACTIVE.IMPORTANT)}>Important notes <FaRegStar color={`${(active === ACTIVE.IMPORTANT) ? "white" :"orange" }`} /></li>
        </ul>
      </div>
      </div>
      
    </div>
  )
}

export default page
