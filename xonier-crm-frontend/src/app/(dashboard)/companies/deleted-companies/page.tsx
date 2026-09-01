"use client"
import extractErrorMessages from "@/src/app/utils/error.utils"
import DeletedTable from "@/src/components/pages/companies/DeletedTable"
import CompanyService from "@/src/services/company.service"
import { Company, CompanyFilterParams } from "@/src/types/company/company.types"
import axios from "axios"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"


const page = () => {
    const [isLoading,setIsLoading]= useState<boolean>(false)
    const [currentPage,setCurrentPage]= useState<number>(1)
    const [pageLimit,setPageLimit]= useState<number>(10)
    const [totalPages,setTotalPages]= useState<number>(1)
    const [searchVal,setSearchVal]= useState<string | " ">("")
    const [companiesData,setCompaniesData] = useState<Company[]>([])
    const [filters,setFilters] = useState<CompanyFilterParams>({})


   const handlePageLimit =(limit:number)=>{
    setPageLimit(limit)
    setCurrentPage(1)

   }
   
    const getCompaniesData = async()=>{
        setIsLoading(true)
        try{
            const result = await CompanyService.getAllDeleted({
                page:currentPage,
                limit: pageLimit,
                search:searchVal ||undefined,
                ...filters
            })
            console.log("data of deleted data ",result.data.data.data)
            const data = result.data.data
            setCompaniesData(data.data)
            setTotalPages(data.totalPages)
           
        }
        catch(error){
            console.log("error in get data :",error)
        }finally{
        setIsLoading(false)

        }


    }

    useEffect(()=>{
getCompaniesData()
    },[currentPage, pageLimit, searchVal, filters])
   
   

    const handleSearch = (val:string)=>{
        setSearchVal(val)
        setCurrentPage(1)

    }

    const handleFilterChange =async(changed: Partial<CompanyFilterParams>)=>{
        setFilters((prev)=>({...prev,...changed}))
        setCurrentPage(1)
    }

    const handleRestore = async(id:string)=>{
        try{
            await CompanyService.restore(id)

            toast.success("restore_successfully")
            getCompaniesData()
        }catch(error){
            if(axios.isAxiosError(error)){
                toast.error(`${extractErrorMessages(error)}`)
            }

        }
        
         
    }

  return (
    <div className='mt-10 lg:ml-72 min-h-screen p-6 overflow-scroll'>
        <DeletedTable
        companyData={companiesData}
        isLoading={isLoading}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        pageLimit={pageLimit}
        totalPages={totalPages}
        setPageLimit={handlePageLimit}
      
        onRestore={handleRestore}
        searchVal={searchVal}
        onSearch={handleSearch}
        filters={filters}
        onFilterChange={handleFilterChange}


        />

    </div>
  )
}

export default page