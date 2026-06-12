"use client"
import { QueryService } from '@/src/services/query.service'
import { QueryData } from '@/src/types/query/query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import  { useEffect, useState } from 'react'
import { BsTelephone } from 'react-icons/bs'
import { CgMail } from "react-icons/cg";
import { FaArrowLeftLong } from 'react-icons/fa6'



const QueryDetail = () => {
    const [isLoading,setIsLoading]=useState<boolean>(false)
    const [queryData,setQueryData]= useState<QueryData[]>([])

    const {id} = useParams<{id:string}>()

    const getQueryById= async()=>{
        if(!id) return;
        setIsLoading(true)
        try{
            const res =  await QueryService.getById(id)

            if(res.status ==200){
                console.log('Query by Id :',res.data.data.data)
                setQueryData(res.data.data.data)
            }


        }catch(err){
            console.log('Err in Query by Id :',err)
        }
        finally{
            setIsLoading(false)
        }


    }

    useEffect(()=>{
        getQueryById()
    },[])

  return (
  <div className="ml-72 mt-14 p-6 flex flex-col gap-10">

  <div className="w-full flex flex-col justify-between ">
    <Link href="/query">
  <button className="group flex items-center gap-3 text-slate-600 hover:text-cyan-600 transition-all mb-6">

    <FaArrowLeftLong className="group-hover:-translate-x-1 transition-all" />

    Back to Queries

  </button>
</Link>


    <div className="flex w-full justify-between items-end mt-4` gap-3">
       <div className="flex items-center gap-6">
        <div className="w-28 h-28 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-4xl font-bold text-blue-600">JS</span>
        </div>

        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900">
            John Smith
          </h1>
          <div className="flex min-h-[20px] items-center text-slate-600 gap-4 mt-4">

            <p className='flex gap-2 items-center text-sm'><span className='text-xl'><CgMail /></span> john.smith@example.com</p>
            <p className='flex gap-2 items-center text-sm'><span className='text-lg'><BsTelephone /></span> +1 415 555 0123</p>


          <span className="flex text-sm items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 ">
            <span className="w-2 h-2  rounded-3xl bg-green-500"></span>
            New Lead
          </span>

          </div>
        </div>
      </div>
     
        {/* Created Date */}
  <div className="flex justify-end items-end ">
    <div className="bg-white rounded-3xl p-6 border border-slate-200 w-[280px] shadow-sm">
      <p className="text-slate-500 text-sm mb-2">
        Created At
      </p>

      <p className="font-semibold text-lg">
        June 10, 2026
      </p>

      <p className="text-slate-500 text-sm">
        09:45 AM
      </p>
    </div>
  </div>
    </div>
    
  </div>



  {/* Info Cards */}
  <div className="grid lg:grid-cols-2 gap-6">

    <div className="bg-white rounded-3xl border border-slate-200 p-8">
      <h3 className="text-xl font-semibold mb-8">
        Personal Details
      </h3>

      <div className="space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Full Name</span>
          <span className="font-medium">John Smith</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">Email</span>
          <span className="font-medium text-blue-600">
            john.smith@example.com
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">Phone</span>
          <span className="font-medium">
            +1 415 555 0123
          </span>
        </div>
      </div>
    </div>

    <div className="bg-white rounded-3xl border p-8 border-slate-200 ">
      <h3 className="text-xl font-semibold mb-8">
        Company Details
      </h3>

      <div className="space-y-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500 ">
            Company Name
          </span>
          <span className="font-medium">
            TechNova Solutions
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Industry Type
          </span>
          <span className="font-medium">
            Information Technology
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-500">
            Team Size
          </span>
          <span className="font-medium">
            50-100
          </span>
        </div>
      </div>
    </div>
  </div>

  {/* Address */}
  <div className="bg-white rounded-3xl border p-8 border-slate-200 mt-6">
    <h3 className="text-xl font-semibold mb-6">
      Address
    </h3>

    <p className="text-slate-600 text-sm">
      123 Market Street, San Francisco, CA 94105, USA
    </p>
  </div>

  {/* Message */}
  <div className="bg-white rounded-3xl border border-slate-200 p-8  mt-6">
    <h3 className="text-xl font-semibold mb-6">
      Inquiry / Message
    </h3>

    <div className="bg-slate-50 rounded-2xl text-sm py-6 px-2 text-slate-700 leading-8">
      We are looking for an HRMS solution to streamline
      employee management, attendance tracking, payroll
      processing, and performance reviews. Please share
      more details about your product and pricing.
    </div>
  </div>

  {/* Additional Info */}
  <div className="bg-white rounded-3xl border border-slate-200 p-8 mt-6">
    <h3 className="text-xl font-semibold mb-8">
      Additional Information
    </h3>

    <div className="space-y-4">

      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-500">
          Lead ID
        </span>

        <span className="font-mono bg-slate-100 px-4 py-2 rounded-lg">
          6a293232b5a1cdbcd3518769
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-slate-500">
          Created At
        </span>

        <span className="font-medium">
          June 10, 2026 09:45 AM
        </span>
      </div>

    </div>
  </div>

</div>
  )
}

export default QueryDetail
