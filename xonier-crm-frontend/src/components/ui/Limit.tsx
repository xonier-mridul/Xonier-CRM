import { useEffect, useRef } from "react";
import { MdKeyboardArrowDown } from "react-icons/md";
import { Dispatch, SetStateAction, useState } from "react";

interface LimitProps {
  pageLimit: number;
  setPageLimit: Dispatch<SetStateAction<number>>;
}

const Limit= ({pageLimit, setPageLimit}: LimitProps)=>{
    const limits = [10, 20, 30, 40];

const [openLimit, setOpenLimit] = useState(false);
const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {

    const handleOutClick = (e:MouseEvent)=>{
      if(searchRef.current && !searchRef.current.contains(e.target as Node)){
        setOpenLimit(false)
      }
    }

    document.addEventListener("mousedown",handleOutClick)

  return ()=>{
    document.removeEventListener("mousedown",handleOutClick)
  }



  }, []);
    return(
        <div
        ref={searchRef}
         className="relative w-16">
            <button
                onClick={() => setOpenLimit(!openLimit)}
                className="w-full h-12 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 flex items-center gap-1"
            >
                <span className='text-slate-600'>{pageLimit}</span>
                <MdKeyboardArrowDown
                className={`transition-transform text-xl ${
                    openLimit ? "rotate-180" : ""
                }`}
                />
            </button>

            {openLimit && (
                <div className="absolute py-2 top-full mt-2 w-full rounded-lg  border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 shadow-lg overflow-hidden z-20">
                {limits.map((limit) => (
                    <div
                    key={limit}
                    onClick={() => {
                        setPageLimit(limit);
                        setOpenLimit(false);
                    }}
                    className={`px-4 flex items-center  py-2 cursor-pointer transition-colors
                        ${
                        pageLimit === limit
                        ? "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/20 dark:text-cyan-300"
                        : "hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600"
                    }`}
                >
                {limit}
                </div>
            ))}
            </div>
        )}
        </div>
    )
}
export default Limit