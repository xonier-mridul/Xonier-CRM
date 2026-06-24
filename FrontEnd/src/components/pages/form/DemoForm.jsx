import { useState } from 'react'
import { TfiHeadphoneAlt } from "react-icons/tfi";
import { BiCheckShield } from "react-icons/bi";
import { GoDotFill } from "react-icons/go";
import 'react-phone-input-2/lib/style.css'
import Countries from '../../common/Countries';
import axios from 'axios';
import { toast } from 'react-toastify';




const DemoForm = () => {

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        industryType: '',
        companyName: '',
        teamSize: '',
        message: '',
    })

    const handleChange = (e) => {
        const { value, name } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))

    }



    const handleSubmit = async (e) => {
        e.preventDefault()
        console.log(formData)
        try {
            const res = await axios.post('http://0.0.0.0:8000/api/query',
                formData
            )
            console.log(formData)


            if (res.status === 200) {
                toast("Thank's, we will connect soon....")

                console.log('Form data submit success')

                setFormData(
                    {
                        name: '',
                        email: '',
                        phone: '',
                        address: '',
                        industryType: '',
                        companyName: '',
                        teamSize: '',
                        message: '',
                    }
                )

            }
        } catch (err) {
            console.log("error found :", err)
        }
    }

    return (
        <div className='w-full min-h-[90vh] py-20 bg-[linear-gradient(180deg,_#f1f6fb_0%,_#eaf3f9_100%)]'>
            <div className='max-w-7xl mx-auto h-full grid gap-10 px-4  grid-cols-5'>
                <div className='col-span-5 md:col-span-2 px-10 md:px-5 lg:px-2'>
                    <div>
                        <span className='flex  items-center w-fit gap-2 text-[13.5px] bg-white py-[7px] px-[16px] rounded-3xl text-[var(--teal-600)] font-medium mb-6'>
                            <span className="h-4 w-4 flex justify-center items-center rounded-full bg-teal-100 text-lg"><GoDotFill /></span>

                            Book a free Demo </span>
                        <h1 className='text-4xl md:text-5xl'>Show How a Trakeroo Transform <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent"> Your WorkfLow</span> </h1>
                        <p className='text-[18px] mt-4 text-[var(--ink-500)]'>Management project team, sales, and support from one powerful dashboard built for modern business </p>


                    </div>
                    <div className=''>
                        <div className='flex gap-4 py-10 border-b border-slate-200 '>
                            <span className='text-4xl text-[var(--teal-600)] h-14 w-16  flex justify-center items-center rounded-2xl bg-white '><TfiHeadphoneAlt />
                            </span>
                            <div className='grid gap-3'>
                                <h3 className='text-[18px]'>24/7 Support</h3>
                                <p className='text-[16px] text-[var(--ink-500)]'>Our Expert are always available to help you succeed</p>
                            </div>
                        </div>

                        <div className='flex gap-4 py-10'>
                            <span className='h-14 w-16 flex justify-center items-center rounded-2xl bg-white'><BiCheckShield className='text-5xl text-[var(--teal-600)] ' />
                            </span>
                            <div className='grid gap-3'>
                                <h3 className='text-[18px]'>Enterprise Ready</h3>
                                <p className='text-[16px] text-[var(--ink-500)]'>Built for startup and large teams with enterprise-grade security</p>
                            </div>
                        </div>


                    </div>




                </div>
                <div className='col-span-5 md:col-span-3 h-full  '>
                    <form
                        onSubmit={handleSubmit}
                        className='grid grid-cols-2 gap-4  py-10 px-8 rounded-2xl border border-slate-100 backdrop-blur-2xl bg-white '>
                        <div className='flex flex-col gap-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Name<span className='text-red-400 pl-1'>*</span>
                            </label>
                            <input
                                type='text'
                                required
                                name='name'
                                className='border border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'
                                onChange={handleChange}
                                placeholder='Enter name'
                                value={formData.name}
                            />
                        </div>

                        <div className='flex flex-col gap-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Email<span className='text-red-400 pl-1'>*</span>
                            </label>
                            <input
                                name='email'
                                type='email'
                                className='border border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'
                                required
                                placeholder='demo@gmail.com'
                                value={formData.email}
                                onChange={handleChange}
                            />

                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Phone Number<span className='text-red-400 pl-1'>*</span>
                            </label>
                            <div className='flex gap-2 border items-center border-slate-100  rounded-2xl  outline-0 hover:border-slate-300'>
                                <div className='w-20 text-sm flex'>
                                    <Countries />

                                </div>
                                <input
                                    type='text'
                                    required
                                    name='phone'
                                    className=' py-4 w-full px-3 text-sm '

                                    onChange={handleChange}
                                    placeholder='+91-9310******'
                                    value={formData.phone} />

                            </div>


                        </div>


                        <div className='flex flex-col gap-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Address<span className='text-red-400 pl-1'>*</span>
                            </label>
                            <input
                                type='text'
                                required
                                name='address'
                                className='border border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'
                                required
                                onChange={handleChange}
                                placeholder='Enter Address'
                                value={formData.address}
                            />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Company Name<span className='text-red-400 pl-1'>*</span>
                            </label>
                            <input
                                name='companyName'
                                type='text'
                                className='border border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'
                                required

                                placeholder='Your company'
                                value={formData.companyName}
                                onChange={handleChange}
                            />

                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Team Size<span className='text-red-400 pl-1'>*</span>
                            </label>

                            <select
                                name='teamSize'
                                type='text'
                                required
                                className='border border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'
                                value={formData.teamSize}
                                onChange={handleChange}
                            >
                                <option value="">Select</option>

                                <option value='1-10' >1-10</option>
                                <option value='10-50'>10-50</option>
                                <option value='50-100'>50-10</option>
                                <option value='100+'>100+</option>



                            </select>

                        </div>
                        <div className='flex flex-col gap-2 col-span-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Industry type<span className='text-red-400 pl-1'>*</span>
                            </label>
                            <input
                                type='text'
                                name='industryType'
                                className='border border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'

                                onChange={handleChange}
                                placeholder='e.g. Technology, Healthcare, Finance'
                                value={formData.industryType}
                            />

                        </div>

                        <div className='flex flex-col gap-2 col-span-2'>
                            <label className='text-lg text-slate-500 font-medium'>
                                Message
                            </label>
                            <textarea
                                type='text'

                                name='message'
                                className='border w-full h-[100px] border-slate-100 rounded-2xl py-4 px-3 text-sm outline-0 hover:border-slate-300'

                                onChange={handleChange}
                                placeholder='Enter message'
                                value={formData.message}
                            />
                        </div>

                        <button
                            type='submit'
                            className='col-span-2 py-4 mt-5 rounded-2xl transition-all duration-400 outline-0 bg-blue-500 text-white font-bold hover:bg-blue-600'
                        >Submit</button>




                    </form>
                </div>

            </div>




        </div>
    )
}

export default DemoForm