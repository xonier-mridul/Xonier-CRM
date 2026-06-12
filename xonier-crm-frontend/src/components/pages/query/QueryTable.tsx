import { QueryData, QueryTableProps } from '@/src/types/query/query'
import { IoIosSearch } from 'react-icons/io';
import Pagination from '../../common/pagination';
import Skeleton from 'react-loading-skeleton';
import { FaEye } from 'react-icons/fa';
import Link from 'next/link';
import { MdDelete } from 'react-icons/md';

const QueryTable :React.FC<QueryTableProps>= ({queryData,
        totalPage,
        onDelete,
        selected,
        onSelect,
        onBulkDelete,
        isLoading,
        currentPage,setCurrentPage,
        pageLimit,setPageLimit}) => {

  return (
   <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-900/10 dark:border-gray-700 w-full flex flex-col gap-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-4 justify-between p-6 border-b border-slate-900/10 dark:border-gray-700">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold dark:text-white text-slate-900">Query</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage Queries</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={pageLimit}
            className="bg-slate-50 dark:bg-gray-700 px-3 py-2 rounded-lg border border-slate-900/10 dark:border-gray-600 text-sm dark:text-white"
            onChange={(e) => setPageLimit(Number(e.target.value))}
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>
          { selected.length>=2 &&
             <div>
            <button onClick={onBulkDelete} className="  px-3 py-2 rounded-xl border hover:borderx-red-400  border-slate-200 text-sm flex gap-2 bg-slate-100 justify-center items-center text-gray-500 hover:border-red-400 dark:text-gray-400 hover:bg-red-100 hover:text-red-400">
                           <MdDelete />
                          Delete All
            </button>
          </div>

          }
         

        </div>
      </div>

      <div className="overflow-x-auto px-6">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 dark:border-gray-700">
              {["Select","Name", "Company Name", "Industry Type", "Email","Team Size", "Created At", "Actions"].map((col) => (
                <th
                  key={col}
                  className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 pr-4 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
            {!isLoading ? 
            (
              queryData && queryData.length > 0 ? (
                queryData.map((query:QueryData) => {
                    const time = query.createdAt.split('T')[0]
                  return (
                    <tr  key={query.id} 
                    onClick={()=>onSelect(query.id)}
                   className={`group ${
                      selected.includes(query.id) ? 'bg-red-50 text-black/70' : 'hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors'}`}
                    >

                      <td className="py-4 pr-4">
                        <div className="flex pl-2 ">
                            <input type="checkbox"                                     
                          checked={selected.includes(query.id)}
                          onChange={() => onSelect(query.id)}
                          onClick={(e) => e.stopPropagation()}/>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-xs  dark:text-white capitalize whitespace-nowrap">{query.name}</span>
                          
                        </div>
                      </td>

                      <td className="py-4 pr-4">
                        <div className="flex ">
                            <span className="font-medium text-xs  dark:text-white whitespace-nowrap">{query.companyName}</span>
                        </div>
                      </td>
                       <td className="py-4 pr-4">
                        <div className="flex ">
                            <span className="font-medium text-xs text-slate-500 dark:text-white whitespace-nowrap">{query.industryType}</span>
                        </div>
                      </td>
                       <td className="py-4 pr-4">
                        <div className="flex ">
                            <span className="font-medium text-xs text-slate-500 dark:text-white whitespace-nowrap">{query.email}</span>
                        </div>
                      </td>
                      

                       <td className="py-4 pr-4">
                        <div className="flex ">
                            <span className="font-medium text-xs text-slate-500 dark:text-white whitespace-nowrap">
                              <span className='px-2 py-1 bg-green-200 rounded-3xl text-green-600 '>
                                {query.teamSize}
                                </span></span>
                        </div>
                      </td>
                       <td className="py-4 pr-4">
                        <div className="flex ">
                            <span className="font-medium text-xs text-slate-500 dark:text-white whitespace-nowrap">{time}</span>
                        </div>
                      </td>
                       <td className="py-4 pr-4 flex gap-2">
                        <div className="flex gap-2">
                        <Link href={`/query/${query.id}`}>

                          <span className={`h-8 w-8 p-2 rounded-xl ${
                      selected.includes(query.id) ? 'bg-blue-100 text-blue-400 border border-blue-500 hover:border-sky-500':' bg-slate-200 text-gray-500'}  text-xl flex justify-center items-center  dark:text-gray-400 hover:bg-sky-100 hover:text-sky-500`} >
                            <FaEye />
                          </span>
                        </Link>
                         
                           <button onClick={()=>onDelete(query.id)} className={` h-8 w-8 p-2 rounded-xl  ${
                      selected.includes(query.id) ? 'bg-teal-200 text-teal-600 border border-teal-500 hover:border-red-500':' bg-slate-200 text-gray-500'}   text-xl flex justify-center items-center dark:text-gray-400 hover:bg-red-100 hover:text-red-400`}>
                           <MdDelete />
                          </button>
                          
                        </div>
                      
                        
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400 text-sm">
                    No plans found
                  </td>
                </tr>
              )
            ) : (
              Array.from({ length: pageLimit }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-gray-700">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="py-4 pr-4">
                      <Skeleton height={24} borderRadius={8} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 pb-6 bg-red-400x">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPage}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
    </div>
  )
}

export default QueryTable