

import React from 'react'
import { Link } from 'react-router-dom'

const DropDown = ({ title, items, top }) => {
    return (
        <div className='flex flex-col gap-4 z-5'>

            <span className='w-fit text-sm text-gray-600 whitespace-nowrap px-3'>{title}</span>
            <ul className="flex flex-col gap-2 text-sm font-medium tracking-normal">
                {
                    items.map((i) => {
                        return (
                            <Link to={`/Solution/${top}/${i.slug}`}
                                onClick={() => window.scrollTo(0, 0)}>

                                <li key={i.id}
                                    className="hover:bg-slate-50 border border-white hover:border-y-0  hover:border-slate-200 px-2  py-2 rounded-lg text-slate-400 hover:text-[#16c2cf] cursor-pointer text-sm whitespace-nowrap">
                                    {i.head}
                                </li>
                            </Link>

                        )
                    })
                }
            </ul>

        </div>
    )
}

export default DropDown