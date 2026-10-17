"use client"
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next';
interface PageLimitProps {
setLimitOpen: React.Dispatch<React.SetStateAction<boolean>>;
pageLimit: number;
limitOpen: boolean;
limits: number[];
 handleLimit: (limit: number) => void;
}
const PageLimit = ({
    setLimitOpen,
    pageLimit,
    limitOpen,
    limits,
    handleLimit
}:PageLimitProps

) => {

  const {t} = useTranslation()
 const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
const handleClickOutside = (event: MouseEvent) => {
if (
dropdownRef.current &&
!dropdownRef.current.contains(event.target as Node)
) {
setLimitOpen(false);
}
};

document.addEventListener("mousedown", handleClickOutside);

return () => {
  document.removeEventListener("mousedown", handleClickOutside);
};

}, [setLimitOpen]);
  
  
  return (
     <div  ref={dropdownRef} className=" relative">

          <button
            type="button"
            onClick={() => setLimitOpen((prev) => !prev)}
            className="
              gap-2
              px-2 py-2.5
              text-sm
              rounded-lg
              border border-slate-900/10 dark:border-gray-600
              bg-slate-50 dark:bg-slate-800
              text-slate-900 dark:text-white
              flex items-center justify-between
              outline-none 
            "
          >
            <span>{pageLimit} / {" "}{t("page")}</span>
            <span className="text-xs">▼</span>
          </button>

          {/* Dropdown */}
              {limitOpen && (
                <div
                  className="
                    absolute z-50
                    mt-1
                   
                    rounded-lg
                    border border-slate-900/10 dark:border-gray-600
                    bg-white dark:bg-slate-800
                    shadow-lg
                    overflow-hidden
                  "
                >
                  {limits.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        handleLimit((item));
                        setLimitOpen(false);
                      }}
                      className="
                        w-full
                        px-3 py-2
                        text-left
                        text-sm
                        text-slate-900 dark:text-white
                        hover:bg-slate-100 dark:hover:bg-gray-700
                      "
                    >
                      {item} / {" "}{t("page")}
                    </button>
                  ))}
                </div>
              )}
          </div>
  )
}

export default PageLimit