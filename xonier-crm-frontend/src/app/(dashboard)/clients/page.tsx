import React, { JSX } from 'react'
import { PiUsersFour } from "react-icons/pi";

const page = ():JSX.Element => {
  return (
     <div className={`ml-72 mt-14 p-6`}>
        <div className="flex items-start w-full">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border-[1px] border-slate-900/10  flex flex-col gap-7 items-start  w-1/3">
      <div className="flex flex-col gap-1.5">
            <h2 className="text-xl font-bold dark:text-white text-slate-900 capitalize">
             <PiUsersFour /> All Clients
            </h2>
            
          </div>
      </div>
      </div>
      
    </div>
  )
}

export default page
