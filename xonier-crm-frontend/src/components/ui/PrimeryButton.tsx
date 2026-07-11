import Link from 'next/link'
import React, {FC} from 'react'

const PrimaryButton:FC<PrimaryButtonProps> = ({text, isLoading, disabled, link, icon}) => {
  return (
    <Link href={link} className='bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-md flex relative z-1 items-center capitalize w-fit gap-2'> {icon} {isLoading ? "Loading..." : text}</Link>
  )
}

export default PrimaryButton
