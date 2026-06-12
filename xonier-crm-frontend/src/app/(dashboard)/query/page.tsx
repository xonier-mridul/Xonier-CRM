import QueryTable from '@/src/components/pages/query/QueryTable'
import React from 'react'

const query = () => {

  return (
    <div className="ml-72 mt-14 p-6 flex flex-col gap-6">
        <div className=''>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Query</h1>
        </div>
        <QueryTable

        />
</div>
  )
}

export default query