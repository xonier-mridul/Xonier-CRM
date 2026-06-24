import { FiSearch } from "react-icons/fi";
import { FaPaperPlane } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { blogPageData } from '../../../data/blog';

const Right = () => {
    const { popularPosts, newsletter } = blogPageData

    return (
        <div className='w-full flex flex-col border border-slate-200 bg-white/80 rounded-3xl gap-6 sticky top-20'>

            <div className=' p-5'>
                <div className='flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3'>
                    <FiSearch className='text-slate-400 text-xl' />
                    <input
                        type="text"
                        placeholder='Search articles...'
                        className='w-full outline-none bg-transparent'
                    />
                </div>
            </div>

            <div className='  p-6'>

                <h3 className='text-xl font-bold text-[#043264] mb-6'>
                    Popular Posts
                </h3>

                <div className='space-y-5'>

                    {popularPosts.map((post, index) => (
                        <Link
                            key={index}
                            to='#'
                            className='flex gap-4 overflow-hidden border  p-4 rounded-2xl border-slate-200 group'
                        >
                            <img
                                src={post.image}
                                alt={post.title}
                                className='w-24 h-20 rounded-xl object-cover'
                            />

                            <div>
                                <h4 className='font-semibold text-[#043264] group-hover:text-cyan-600 transition'>
                                    {post.title}
                                </h4>

                                <p className='text-sm text-slate-400 mt-2'>
                                    {post.publishDate}
                                </p>
                            </div>
                        </Link>
                    ))}

                </div>

            </div>

            <div className='bg-gradient-to-br from-cyan-50 rounded-b-3xl to-emerald-50 p-6 '>

                <div className='w-14 h-14 rounded-2xl bg-cyan-500 text-white flex justify-center items-center mb-4'>
                    <FaPaperPlane />
                </div>

                <h3 className='text-2xl font-bold text-[#043264]'>
                    {newsletter.title}
                </h3>

                <p className='text-slate-500 mt-3 leading-7'>
                    {newsletter.desc}
                </p>

                <div className='mt-6 flex flex-col gap-3'>
                    <input
                        type="email"
                        placeholder={newsletter.placeholder}
                        className='w-full border border-slate-200 rounded-xl px-4 py-3 outline-none'
                    />

                    <button className='w-full py-3 rounded-xl text-white font-medium bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b]'>
                        {newsletter.buttonText}
                    </button>
                </div>

            </div>

        </div>
    )
}

export default Right