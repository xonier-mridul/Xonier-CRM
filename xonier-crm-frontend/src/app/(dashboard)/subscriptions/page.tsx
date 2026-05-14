"use client"
import SubscriptionTable from '@/src/components/pages/subscription/SubscriptionTable'
import { Subscription } from '@/src/types/subscription/subscription.types'
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import extractErrorMessages from '../../utils/error.utils'
import { SubscriptionService } from '@/src/services/subscription.service'
import { number } from 'framer-motion'

const page = () => {
    const [subscriptionData, setSubscriptionData] = useState<Subscription[]>([])
    const [currentPage, setCurrentPage] = useState<number>(1)
    const [pageLimit, setPageLimit] = useState<number>(10)
    const [totalPages, setTotalPages] = useState<number>(1)
    const [err, setErr] = useState<string[] | string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)


    const getSubscriptionsData = async()=>{
        setIsLoading(true)
        try {
            const result = await SubscriptionService.getAll()
            if(result.status === 200){
                const data = result.data.data

               setSubscriptionData(data.data)
               setCurrentPage(data.page)
               setPageLimit(data.limit)
               setTotalPages(data.totalPages)
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
        toast.error(`${extractErrorMessages(error)}`);
      } else {
        toast.error("Failed to load company");
      }
        } finally {
         setIsLoading(false)
        }
    }

    const onPageChange = (page:number)=>{

      setCurrentPage(page)
      
    }

    useEffect(() => {
      getSubscriptionsData()
    }, [currentPage, pageLimit])
    

    console.log("subscription data: ", subscriptionData)

  return (
     <div className="ml-72 mt-14 p-6 flex flex-col gap-6">
       <SubscriptionTable currentPage={currentPage}  totalPages={totalPages} onPageChange={onPageChange}  isLoading={isLoading} subScriptionData={subscriptionData}/>
    </div>
  )
}

export default page
