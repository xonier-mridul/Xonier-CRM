import Image from 'next/image'
import React from 'react'
interface props {
    title: string
}
const DataNotFound = ({title}: props) => {
  return (
    <div className=' bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm  p-6 rounded-xl border-[1px] border-slate-900/10 w-full flex flex-col gap-7 items-center justify-between'>

        <Image src={"/images/page-lost.png"} height={180} width={180} alt='not found' quality={100} className='' />
         <h2 className='text-2xl font-semibold'>Oops, {title} data not found</h2>
    </div>
  )
}

export default DataNotFound
