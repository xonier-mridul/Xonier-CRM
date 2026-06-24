import { FaFacebookF, FaLink, FaLinkedinIn, FaTwitter } from "react-icons/fa";


const Side = ({ side }) => {
    return (
        <div className="sticky top-30 ">
            <div className="flex flex-col ">
                <div className=" space-y-4">
                    {
                        side.details.map((i, ind) => {
                            return (
                                <div key={ind} className="flex gap-4">
                                    <span className="text-xl w-10 h-10 rounded-full bg-cyan-100 text-cyan-500 flex justify-center items-center">{i.icon}</span>
                                    <div className="flex flex-col">
                                        <span className="font-[700]">{i.label}</span>
                                        <span className="text-[12.5px] text-slate-400">{i.value}</span>
                                    </div>

                                </div>
                            )
                        })
                    }
                </div>
                <div className="mt-5 py-5 border-t border-gray-200 flex flex-col gap-4 px-5">
                    <span className="font-[700]">Share this job</span>
                    <div className="flex gap-4" >
                        <a href="https://www.linkedin.com/company/xoniertechnologies">
                            <span className="w-10 h-10 rounded-full text-xl bg-cyan-600 text-white flex justify-center items-center"><FaLinkedinIn /></span>
                        </a>
                        <a href="https://x.com/xonier_tech">
                            <span className="w-10 h-10 rounded-full text-xl bg-sky-600 text-white flex justify-center items-center"><FaTwitter />
                            </span>
                        </a>
                        <a href="https://www.facebook.com/xoniertechInc/">
                            <span className="w-10 h-10 rounded-full text-xl bg-blue-600 text-white flex justify-center items-center"><FaFacebookF />
                            </span>
                        </a>
                        <span className="w-10 h-10 rounded-full text-xl bg-gray-200 text-black flex justify-center items-center"><FaLink />
                        </span>

                    </div>
                </div>



            </div>

        </div>
    )
}

export default Side