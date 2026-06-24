import React from 'react'
import { TfiHeadphoneAlt } from "react-icons/tfi";
import { AiOutlineProduct } from "react-icons/ai";
import { MdOutlineManageHistory } from "react-icons/md";




const data = [
    { id: 1, head: 'Sales Enquire', email: 'dummy@gmail.com', ph: '+91-98*******', icon: <TfiHeadphoneAlt />, color: 'text-amber-400' },
    { id: 2, head: 'Sales Enquire', email: 'dummy@gmail.com', ph: '+91-98*******', icon: <AiOutlineProduct />, color: 'text-red-400' },
    { id: 3, head: 'Sales Enquire', email: 'dummy@gmail.com', ph: '+91-98*******', icon: <MdOutlineManageHistory />, color: 'text-orange-400' },

]

const FormBottom = () => {
    return (
        <div className='w-full pt-20 pb-12 min-h-[40vh] '>
            <div className='max-w-7xl mx-auto px-4 flex gap-5'>
                {
                    data.map((i) => {
                        return (
                            <div key={i.id}
                                className='grid grid-cols-6 bg-am relative gap-6 p-8 h-[200px] w-[400px]  border border-slate-100 
                                rounded-2xl justify-between  overflow-hidden group text-white btn-primary'>

                                <div className='flex flex-col gap-2 col-span-4  justify-center'>
                                    <span className='text-[20px] font-bold'>{i.head}</span>
                                    <a href={`mailto:${i.email}`}>

                                        <span className='text-[15px] mt-4 '><span>Email : </span>{i.email}</span></a>
                                    <a href={`tel:${i.ph}`}>
                                        <span className='text-[15px]'><span>Phone : </span>{i.ph}</span>
                                    </a>
                                </div>
                                <div className='w-20 h-20 rounded-full flex justify-center items-center bg-white col-span-2'>
                                    <div className={` ${i.color} text-5xl flex `}>
                                        {i.icon}</div>
                                </div>
                            </div>
                        )
                    })
                }

            </div>

        </div>
    )
}

export default FormBottom