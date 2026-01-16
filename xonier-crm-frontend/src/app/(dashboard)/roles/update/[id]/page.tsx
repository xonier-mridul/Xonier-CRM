import { SIDEBAR_WIDTH } from '@/src/constants/constants'
import React, { JSX } from 'react'

const page = ():JSX.Element => {
  return (
    <div className={`ml-[${SIDEBAR_WIDTH}] mt-14 p-6`}>
             <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm flex flex-col gap-5 p-6 rounded-xl border-[1px] border-slate-900/10 w-full"> 
             <h2 className="text-xl font-bold dark:text-white">Update Roles</h2>
             </div>
      
    </div>
  )
}

export default page
