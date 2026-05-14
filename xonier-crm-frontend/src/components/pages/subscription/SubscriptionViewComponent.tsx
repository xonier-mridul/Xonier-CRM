import { subScriptionView } from '@/src/types/subscription/subscription.types'
import React from 'react'
import PlanViewSkeleton from '../../ui/PlanView/PlanViewSkeleton'
import { LuCrown } from "react-icons/lu";
import { GoDotFill } from 'react-icons/go';
import { IoCalendarOutline, IoDiamondOutline, IoFlagSharp } from "react-icons/io5";
import { CiCalendar } from "react-icons/ci";
import { CiGlobe } from "react-icons/ci";
import { AiOutlineDollar } from "react-icons/ai";
import { RiProfileLine } from "react-icons/ri";
import { BiDollarCircle } from "react-icons/bi";
import { IoHeartOutline } from "react-icons/io5";
import { BiDollar } from "react-icons/bi";
import { FaDollarSign } from 'react-icons/fa6';
import { FaPlay, FaUser } from 'react-icons/fa';
import { ImCancelCircle } from 'react-icons/im';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';









const SubscriptionViewComponent = ({subScriptionData,isLoading,}:subScriptionView) => {

   
  return (
    <div className='flex p-6 flex-col gap-8'>

        <div className='flex justify-between p-4'>
            <div className='flex gap-6 items-center'>
                <div className='p-4 rounded-full bg-purple-200 text-purple-600'>
                <LuCrown  className='text-5xl '/>


                </div>
            
            <div> 
                <h1 className='text-lg font-bold text-gray-800'>Subscription Detail</h1>
                <h2 className='text-gray-500 text-sm'>Subscription ID : {}</h2>
                <h2 className='text-gray-500 text-sm'>subscription Reference :</h2>
            </div>
            </div>
        
                 <div className='bg-green-100 h-10 text-green-500 flex gap-1 items-center py-2 px-4 rounded-full text-sm w-fit'>
                    <GoDotFill />Active
                </div>
            
        </div>

        <div className='flex   border border-gray-300 rounded-2xl text-lg p-4 justify-between'>
            <div className='w-[80%] flex flex-col gap-7'>

               <div className='flex gap-10 items-center'>
                <div className='p-4 rounded-2xl bg-purple-200 text-purple-600 '>
                <IoDiamondOutline className='text-4xl ' />


                </div>
                <div className='flex flex-col justify-end h-full gap-2 border-b w-full pb-5 border-gray-300'>
                    <h1 className='text-lg font-bold '>Test 4</h1>  
                    <p className='text-gray-500 text-xs'>des</p>
                </div>
        
                
            </div>
            <div className='flex justify-between   w-full '>
                <div className='flex gap-5 items-center p-4 border-r  w-1/3 justify-center border-gray-300'>
                <CiCalendar className='text-4xl text-blue-400 font-bold' />
                <div >
                    <h1 className='text-gray-800 font-bold text-sm'>Trials date</h1>
                    <h2 className='text-gray-500 text-xs'>20 Days</h2>
                </div>
            </div>
                            <div className='flex gap-5 p-4 items-center border-r  border-gray-300 w-1/3 justify-center'>

                <CiGlobe   className='text-4xl text-blue-400 font-bold'/>
                <div>
                    <h1 className='text-gray-800 font-bold text-sm'>Visibility</h1>
                    <h2 className='text-gray-500 text-xs'>Public</h2>
                </div>
            </div>
                           <div className='flex gap-5 p-4 items-center w-1/3 justify-center'>

                <AiOutlineDollar  className='text-4xl text-blue-400 font-bold' />
                <div>
  <h1 className='text-gray-800 font-bold text-sm'>Currency</h1>
                <h2 className='text-gray-500 text-xs'>USD</h2>
                </div>
              
            </div>
            </div>

            </div>
            <div className='w-[18%] flex flex-col justify-between border-l border-gray-300'> 
                 <div className='h-1/2  py-4 border-b border-gray-300 mx-4'>
                <h2 className='text-sm mb-2'>MonthlyPrice</h2>
                <h1 className='text-xl '>$59</h1>
            </div>
                  <div className='h-1/2  py-4   mx-4'>
                 <h2 className='text-sm mb-2'>YearlyPrice</h2>
                <h1 className='text-xl '>$599</h1>
            </div>
                 </div>
        </div>
        <div className='flex justify-between text-lg  '>
            <div className='w-[48%]   border border-gray-300 rounded-2xl'>
            <div className=' flex  items-center bg-slate-100 rounded-t-2xl  gap-4 p-4'>
                <div className='p-2 rounded-xl text-blue-400 text-xl bg-blue-100'>
                       <RiProfileLine />
                </div>
                
                <h1 className='text-lg font-bold'>Billing & Pricing</h1>
                 
                   
             
            </div>
             <div className='flex  justify-between items-center gap-4 p-4'> 
                <div className='flex gap-4 items-center'>
                    <div className='p-2 rounded-full text-blue-400 text-lg bg-blue-100'>
<CiCalendar  />
                </div>
                                    
                <h1 className='text-gray-600 text-sm'> Billing Cycle</h1>
                </div>
                 <p className='text-blue-500 '>Monthly</p>
                
            </div>
            <div className='flex  justify-between items-center gap-4 p-4'> 
                <div className='flex gap-4 items-center'>

                     <div className='p-2 rounded-full text-blue-400 text-lg bg-blue-100'>
                    <FaDollarSign />

                </div>

                <h1 className='text-gray-600 text-sm'> Basic Price</h1>
                </div>
                 <p className='text-lg'>$59.00</p>
                
            </div><div className='flex  justify-between items-center gap-4 p-4'> 
                <div className='flex gap-4 items-center'>
                     <div className='p-2 rounded-full text-blue-400 text-lg bg-blue-100'>
                   <IoHeartOutline />

                </div>
                    
                <h1 className='text-gray-600 text-sm'> Discount Amount </h1>
                </div>
                 <p className='text-green-500 text-lg'>$0.00</p>
                
            </div><div className='flex  justify-between items-center gap-4 p-4'> 
                <div className='flex gap-4 items-center'>
                     <div className='p-2 rounded-full text-blue-400 text-lg bg-blue-100'>
                                       <BiDollar />

                </div>
                <h1 className='text-gray-600 text-sm'>Final Price</h1>
                </div>
                 <p className='text-blue-500 text-lg'>$59.00</p>
                
            </div>
           
            </div>
            <div className='w-[48%] flex flex-col  border border-gray-300 rounded-2xl'>
            <div className=''>
               <div className=' flex  items-center bg-green-100 rounded-t-2xl  gap-4 p-4'>
                <div className='p-2 rounded-xl text-green-400 text-xl bg-green-200'>
                       <IoCalendarOutline />
                </div>
                <h1 className='text-lg font-bold'>Subscription Timeline</h1>
            </div>

            <div className='relative p-4 flex flex-col gap-4'>
                <div className='absolute z-0 h-[250px] top-7 w-[2px] left-8 border-gray-400 border-l-2 left-1 border-dashed'></div>
                <div className='flex gap-4 items-center'>
                    <div className='p-2 rounded-full bg-green-100 z-1 text-green-400 w-fit text-xl '>
                    <FaPlay />

                    </div>
                    <div>
                        <h1 className='text-sm text-gray-700'>Trial Start Date</h1>
                        <span className='text-gray-500 text-xs'>May</span>
                    </div>
                </div>
                <div className='flex gap-4 items-center'>
                    <div className='p-2 rounded-full z-1 bg-green-100 text-green-400 w-fit text-xl '>
                    <IoFlagSharp />

                    </div>
                    <div>
                        <h1 className='text-sm text-gray-700'>Trial End Date</h1>
                        <span className='text-gray-500 text-xs'>May</span>
                    </div>
                </div>
                <div className='flex gap-4 items-center'>
                    <div className='p-2 z-1 rounded-full bg-blue-100 text-blue-400 w-fit text-xl '>
                    <FaPlay />

                    </div>
                    <div>
                        <h1 className='text-sm text-gray-700'>Subscription Start Date</h1>
                        <span className='text-gray-500 text-xs'>May</span>
                    </div>
                </div>
                <div className='flex gap-4 items-center'>
                    <div className='p-2 rounded-full z-1 bg-blue-100 text-blue-400 w-fit text-xl '>
                    <IoFlagSharp />

                    </div>
                    <div>
                        <h1 className='text-sm text-gray-700'>Subscription End Date</h1>
                        <span className='text-gray-500 text-xs'>May</span>
                    </div>
                </div>
                <div className='flex gap-4 items-center'>
                    <div className='p-2 rounded-full z-1 bg-white w-fit text-xl '>
                    <ImCancelCircle />

                    </div>
                    <div className='flex flex-col'>
                        <h1 className='text-sm text-gray-700'>Cancelled At</h1>
                        <span className='text-gray-500 text-xs'>-</span>
                        <span className='text-xs'>Reason :-</span>
                    </div>
                </div>
            </div>
                

            </div>
            
            </div>

        </div>
        <div className='flex border border-gray-300 gap-4  p-4 rounded-2xl'>
            <div className='flex w-1/2 gap-4 items-center border-r border-gray-200'>
                <div className='p-4 bg-purple-200 text-purple-400 text-2xl relative   rounded-full' ><HiOutlineBuildingOffice2 /></div>
                <div className='flex flex-col gap-2'>
                    <h1 className='text-lg font-bold text-purple-400'>Company</h1>
                    <h2 className='text-sm text-gray-600'>Company Id : <span>Id</span></h2>
                    
                    <h2 className='text-sm text-gray-600'>Collection :  <span>Company</span></h2>
                   

                </div>
            </div>
            <div className='flex w-1/2 gap-4 items-center'>
                <div className='p-4 bg-amber-200 text-amber-400 text-2xl relative   rounded-full' ><FaUser /></div>
                <div className='flex flex-col gap-2'>
                    <h1 className='text-lg font-bold text-amber-400'>Created By</h1>
                    <h2 className='text-sm text-gray-600'>User Id : <span>Id</span></h2>
                    
                    <h2 className='text-sm text-gray-600'>Collection :  <span>User</span></h2>
                   

                </div>
            </div>
           


        </div>
        <div className='flex  border border-gray-300 text-sm gap-4 p-4 text-gray-500 rounded-2xl'>
            <div className='flex gap-2 w-1/3  border-r border-gray-200 items-center'>
                <div className='text-xl  font-bold'>
                <CiCalendar  />
                </div>
                <div className='flex flex-col'>
                    <h1>Created At</h1>
                    <h2 className='text-xs'> May</h2>
                </div>
            </div>
            <div className='flex gap-2 w-1/3  border-r border-gray-200 items-center'>
                <div className='text-xl  font-bold'>
                <CiCalendar  />
                </div>
                <div className='flex flex-col '>
                    <h1>Updated At</h1>
                    <h2 className='text-xs'>--</h2>
                </div>
            </div>
            <div className='flex gap-2 w-1/3 items-center'>
                <div className='text-xl  font-bold'>
                <CiCalendar  />
                </div>
                <div className='flex flex-col '>
                    <h1>Deleted At</h1>
                    <h2 className='text-xs'>--</h2>
                </div>
            </div>

        </div>


        
    </div>
  )
}

export default SubscriptionViewComponent