import Pagination from '../../common/pagination'
import { SubscriptionTableProps } from '@/src/types/subscription/subscription.types'
import Skeleton from "react-loading-skeleton";
import { GoDotFill } from "react-icons/go";
import {  IoEyeOutline } from "react-icons/io5";
import { CURRENCY } from '@/src/constants/enum';
import Link from 'next/link';

const currencySymbol:Record<string,string>={
  [CURRENCY.USD]:"$",
  [CURRENCY.EUR]: "€",
  [CURRENCY.GBP]: "£",
}
const SubscriptionTable = ({currentPage,isLoading,pageLimit ,totalPages,onPageChange, subScriptionData }: SubscriptionTableProps) => {
  return (
    <div>

      <table className='w-full  rounded-xl overflow-hidden  '>
        <thead className=''>
          <tr className='w-full border-b-2 border-zinc-500 bg-blue-100 dark:bg-gray-800'>
            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Subscription ID</th>
            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Plant Name</th>
            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Status</th>
            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Final Price</th>
            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Billing Cycle </th>

            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Start Subscription Date</th>
            <th className='p-4 uppercase text-sm text-start text-slate-500 dark:text-slate-100'>Action</th>

          </tr>
          
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
          {
            !isLoading ? (subScriptionData && subScriptionData.length > 0 ? 
              (
                subScriptionData.map((item,index)=>{
                  const even = index % 2 == 0
                  const symbol = currencySymbol[item.planId.currency] ?? ''
                  const start = new Date(item.startSubscriptionDate).toLocaleDateString('en-IN',{
                    day: 'numeric',
                    month: 'long',
                    year : 'numeric'
                  })

              return(
                <tr key={item.id} className={` ${even ? 'bg-white dark:bg-transparent': 'bg-slate-50 dark:bg-gray-400'}  text-sm text-gray-600 `}>
                 
                  <td className='p-4 text-start  text-nowrap'>
                    {item.subscriptionId}
                  </td><td className='p-4 text-start capitalize'>
                    {item.planId.name}
                  </td>
                 
                  <td className='p-4 text-start capitalize'>
                    <div className='bg-green-100 text-green-500 flex gap-1 items-center py-2 px-4 rounded-full text-sm w-fit'>
                      <GoDotFill />{item.status}


                    </div>
                  </td><td className='p-4 text-start'>
                   {symbol}{item.finalPrice}
                  </td>
                   <td className='p-4 text-start capitalize'>
                    {item.billingCycle}
                  </td>
                  <td className='p-4 text-start'>
                    {/* {item.startSubscriptionDate} */}
                    {start}
                  </td>
                  <td className=''>
                    <div className=' flex py-1 px-3 justify-center items-center bg-teal-100 cursor-pointer  text-teal-600 w-fit rounded-2xl'>
                      <Link href={`/subscription/${item.id}`}>
                        <IoEyeOutline className="font-bold" />

                      </Link>
                      
                    </div>
                  </td>
                </tr>

              )
            })):(<tr>
              <td colSpan={6} className='text-gray-400 py-16'> No data found</td>
            </tr>) ) : (
                          Array.from({ length: pageLimit }).map((_, i) => (
                            <tr key={i} className="border-b odd:bg-white even:bg-slate-100 tra border-slate-100 dark:border-gray-700">
                              {Array.from({ length: 7 }).map((_, j) => (
                                <td key={j} className="py-4 pr-4">
                                  <Skeleton height={24} borderRadius={8} />
                                </td>
                              ))}
                            </tr>
                          ))
                        )
          }
          <tr>
            <td></td>
          </tr>
        </tbody>
        
      </table>
      <div className="px-6 pb-6">
      <Pagination  currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange}  className=''/>

      </div>

      


    </div>
  )
}

export default SubscriptionTable
