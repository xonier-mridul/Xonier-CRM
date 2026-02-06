"use client"
import { MARGIN_TOP, SIDEBAR_WIDTH } from '@/src/constants/constants'
import React, {JSX, useEffect, useState} from 'react'
import { ParamValue } from 'next/dist/server/request/params' 
import { useParams } from 'next/navigation'
import { User } from '@/src/types'
import extractErrorMessages from '@/src/app/utils/error.utils'
import axios from 'axios'
import { AuthService } from '@/src/services/auth.service'
import UserDetail from '@/src/components/pages/users/UserDetail'

const page = (): JSX.Element => {
  const [userData, setUserData] = useState<User | null>(null)
  const [err, setErr] = useState<string[] | string | null>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const id: ParamValue = useParams().id

  const getUser = async(id: ParamValue): Promise<void>=>{
    setIsLoading(true)
    setErr(null)
    try {
      const result = await AuthService.getUserById(id)

      if (result.status === 200){
        setUserData(result.data.data)
        
      }
    } catch (error) {
      process.env.NEXT_PUBLIC_ENV === "development" && console.error(error);
      if (axios.isAxiosError(error)) {
        const messages = extractErrorMessages(error);
        setErr(messages);
      } else {
        setErr(["Something went wrong"]);
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getUser(id)
  }, [])
  

  return (
    <div className={`ml-72 mt-14 p-6`}>
       <UserDetail userData={userData} isLoading={isLoading}/>
      
    </div>
  )
}

export default page
