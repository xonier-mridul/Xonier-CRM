import Link from 'next/link'
import React, {FC} from 'react'

const PrimaryButton:FC<PrimaryButtonProps> = ({text, isLoading, disabled, link, icon}) => {
  return (
    <Link href={link} className='bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-md flex items-center capitalize w-fit gap-2'> {icon} {isLoading ? "Loading..." : text}</Link>
  )
}

export default PrimaryButton
