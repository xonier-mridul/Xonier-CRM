'use client'
import SubscriptionViewComponent from '@/src/components/pages/subscription/SubscriptionViewComponent'
import { SubscriptionService } from '@/src/services/subscription.service'
import { Subscription } from '@/src/types/subscription/subscription.types'
import { useParams } from 'next/navigation'
import  { useEffect, useState } from 'react'

const SubscriptionViewPage = () => {

    const [isLoading,setIsLoading] =useState<boolean>(false)
    const [subscriptionData,setSubscriptionData] =useState<Subscription | null>(null)
    const [errMessage,setErrMessage]= useState<string>('')

    const {id } = useParams<{id:string}>()


    const getDatabyId = async():Promise<void>=>{
        setIsLoading(true)
        setSubscriptionData(null)
        if(!id){
            setIsLoading(false);
            return;
        }
        try{
            const res = await SubscriptionService.getById(id)

            if(res.status === 200){
                setSubscriptionData(res.data.data)
            }

        }catch(err : any){
            setErrMessage(err)
        }finally{
            setIsLoading(false)
        }

    }

    useEffect(()=>{
        getDatabyId()
    },[id])
    
    console.log('getDataby id :',subscriptionData)


  return (
     <div className="ml-72 mt-14 p-6 flex flex-col gap-6">
        <SubscriptionViewComponent subscriptionData={subscriptionData} isLoading={isLoading}  />
    </div>
  )
}

export default SubscriptionViewPage