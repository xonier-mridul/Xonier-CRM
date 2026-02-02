import { TabsButtonProps } from '@/src/types/components/ui/tabButton.types'
import React from 'react'



const TabsButton = ({btnTxt, dataLen, currentVal, no, onClickEvent}:TabsButtonProps) => {
  return (
    <button className={`flex items-center justify-center cursor-pointer gap-3 text-sm ${(Number(currentVal) === Number(no)) ? "bg-blue-600 text-white" : 'bg-gray-200/90 text-blue-600'}   px-6 py-2.5 font-semibold rounded-full`} onClick={onClickEvent}>
       {btnTxt} <span className={`bg-white text-blue-500  text-xs rounded-full h-4.5 w-4.5 flex items-center justify-center `}>{dataLen}</span>
    </button>
  )
}

export default TabsButton
