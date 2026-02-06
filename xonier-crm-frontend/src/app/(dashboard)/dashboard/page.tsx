import SideBar from '@/src/components/layouts/SideBar'
import Monitor from '@/src/components/pages/dashboard/Monitor'
import React from 'react'

const page = () => {
  return (
    <div className=' mt-10 ml-72 flex flex-col gap-4 backdrop-blur-md p-6'>
      
        <Monitor/>
      
    </div>
  )
}

export default page
