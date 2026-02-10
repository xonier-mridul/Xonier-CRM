import Link from 'next/link'
import React, {FC} from 'react'

const SecondaryButton:FC<SecondaryButtonProps> = ({text, isLoading, disabled, onClickEvt, icon}) => {
  return (
    <button onClick={onClickEvt} className='bg-teal-500 hover:bg-teal-600 text-white px-5 py-2.5 rounded-md flex cursor-pointer items-center capitalize w-fit gap-2'> {icon} {isLoading ? "Loading..." : text}</button>
  )
}

export default SecondaryButton
