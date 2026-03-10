"use client"
import React, {useState} from 'react'

const page = () => {
    const [currentPage, setCurrentPage] = useState<number>(1);
      const [pageLimit, setPageLimit] = useState<number>(10);
      const [totalPages, setTotalPages] = useState<number>(1);
  return (
    <div className={`ml-72 mt-14 p-6`}>
      
    </div>
  )
}

export default page
