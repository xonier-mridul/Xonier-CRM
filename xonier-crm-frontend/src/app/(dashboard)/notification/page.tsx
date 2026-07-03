"use client"
import { useState } from "react";
import { IoMdCheckmark } from "react-icons/io";
import { IoFilterOutline } from "react-icons/io5";

const page = () => {
    const [openFilter,setOpenFilter]=useState<boolean>(false)
  return (
    <div className="ml-72 mt-14 p-6 min-h-screen">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-slate-900 dark:text-white font-bold text-4xl mb-2">Notification</h1>
                <p className="text-gray-600 dark:text-gray-400">Stay updated with all your alert and system notification.</p>
            </div>
            <button className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 flex gap-2 items-center justify-center">
                <IoMdCheckmark/>
                <span>
                    Mark all as read
                </span>

            </button>

        </div>

        <div className="border border-slate-200 rounded-xl bg-white/80">
        <div className='flex  items-center justify-between py-2 px-6'>
            <ul className="flex gap-4 capitalize">
            {
                ['all','unread','alert', 'alerts','update'].map((i,ind)=>{
                    return(
                        <li 
                        className=""
                        key={ind}>
                            {i}
                        </li>
                    )
                })
            }
            </ul>
            <button 
            className="flex px-4 py-2.5 gap-2 items-center text-slate-500 border border-slate-200 rounded-xl" onClick={()=>setOpenFilter(!openFilter)}>
                <IoFilterOutline />
                Filter
            </button>
            {
                openFilter && (
                    <div>

                    </div>
                )
            }

        </div>

        </div>

    </div>
  )
}

export default page