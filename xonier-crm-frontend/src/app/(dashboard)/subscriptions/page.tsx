import SubscriptionTable from '@/src/components/pages/subscription/SubscriptionTable'
import { Subscription } from '@/src/types/subscription/subscription.types'
import axios from 'axios'
import React, { useState } from 'react'
import { toast } from 'react-toastify'
import extractErrorMessages from '../../utils/error.utils'

const page = () => {
    const [subscriptionData, setSubscriptionData] = useState<Subscription[]>([])
    const [err, setErr] = useState<string[] | string>("")
    const [isLoading, setIsLoading] = useState<boolean>(false)

    const getSubscriptionsData = async()=>{
        setIsLoading(true)
        try {
            const result = await Subs
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

  return (
     <div className="ml-72 mt-14 p-6 flex flex-col gap-6">
       <SubscriptionTable />
    </div>
  )
}

export default page
