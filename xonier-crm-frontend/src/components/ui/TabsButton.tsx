import { TabsButtonProps } from '@/src/types/components/ui/tabButton.types'
import React from 'react'



const TabsButton = ({btnTxt, dataLen, currentVal, no, onClickEvent}:TabsButtonProps) => {
  return (
    <button className={`flex items-center justify-center cursor-pointer gap-3 text-sm ${(Number(currentVal) === Number(no)) ? "bg-cyan-600 text-white" : 'bg-slate-100 text-cyan-600'}   px-6 py-2.5 font-semibold rounded-full`} onClick={onClickEvent}>
       {btnTxt} <span className={`bg-white sm ${(Number(currentVal) === Number(no)) ?'':'dark:bg-slate-300'} text-cyan-500  text-xs rounded-full h-4.5 p-1 flex items-center justify-center `}>{dataLen}</span>
    </button>
  )
}

export default TabsButton
