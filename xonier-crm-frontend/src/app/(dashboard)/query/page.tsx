"use client"
import QueryTable from '@/src/components/pages/query/QueryTable'
import { QueryService } from '@/src/services/query.service'
import { QueryData } from '@/src/types/query/query'
import axios from 'axios'
import  { useEffect, useState } from 'react'


const query = () => {
    const [queryData,setQueryData] = useState<QueryData[]>([])
    const [currentPage,setCurrentPage]= useState<number>(1)
    const [pageLimit,setPageLimit]= useState<number>(10)
    const [search,setSearch] = useState<string>("")
    const [totalPage,setTotalPages] = useState<number>(1)
    const [isLoading,setIsLoading] = useState<boolean>(false)
    const [selectId,setSelectId] = useState<string[]>([])

    const getQueryData = async(search?:string)=>{
        setIsLoading(true)
        try{
            const filter:Record<string,string> ={}
            if(search && search.trim()) filter.search=search.trim()
            const res = await QueryService.getAll(currentPage,pageLimit,filter)

            if(res.status === 200){
                setQueryData(res.data.data.data)
                console.log("QueryData :",res.data.data.data)
                setCurrentPage(res.data.data.page);
                setTotalPages(res.data.data.totalPages);
                setPageLimit(res.data.data.limit);
            }
        }catch(err){
            console.log('Error in Query :',err)
        }
        finally{
            setIsLoading(false)
        }
    }
    useEffect(()=>{
        getQueryData(search)
    },[currentPage, pageLimit])

    const handleChange=(value:string)=>{
                setSearch(value)

    }
    const handleDelete = async(id:string)=>{
        setIsLoading(true)
        try{
            const res = await QueryService.deleteById(id)

            if(res.status== 200){
                getQueryData()
            }

        }catch(err){
            console.log("Err in deleteBy Id :",err)
        }finally{
            setIsLoading(false)
        }
    }

    const handleBulkDelete =async()=>{
        setIsLoading(true)
        console.log("qq: ",selectId )
        try{
            const res = await QueryService.bulkDelete(selectId)
            if(res.status=== 200){
                setSelectId([])
                getQueryData()
            }

        }catch(err){
            console.log("Err in delete :",err)

        }finally{
            setIsLoading(false)
        }
    }

    const handleSelect = (id:string)=>{
        setSelectId((prev)=>
        prev.includes(id)? (prev.filter((i)=>i != id)):[...prev,id] )

    }

    console.log('payload is :',selectId)


  return (
    <div className="lg:ml-72 mt-14 p-6 flex flex-col gap-6">
        <div className=''>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Query</h1>
        </div>
        <QueryTable
        queryData={queryData}
        totalPage={totalPage}
        handleChange={handleChange}
        currentPage={currentPage}
        pageLimit={pageLimit}
        setPageLimit={setPageLimit}
        onBulkDelete={handleBulkDelete}
        onDelete={handleDelete}
        onSelect= {handleSelect}
        selected={selectId}
        setCurrentPage={setCurrentPage}
        isLoading={isLoading}
        />
</div>
  )
}

export default query