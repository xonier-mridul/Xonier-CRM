import { CiLocationOn } from "react-icons/ci";
import { PiToolboxLight } from "react-icons/pi";
import { VscGraph } from "react-icons/vsc";
import { MdKeyboardArrowRight, MdOutlineHome } from "react-icons/md";
import { Link } from "react-router-dom";

const Hero = ({ data }) => {
    return (

        <div className=" col-span-2 ">

            <div className="">
                <div className="flex gap-2 items-center text-lg text-slate-400">
                    <span><MdOutlineHome /></span><span className="text-[14.5px]">Career</span><span><MdKeyboardArrowRight /></span><span className="text-[14.5px]">{data.title}</span>

                </div>
                <div className="p-4 bg-white flex justify-between border border-slate-100 mt-2 rounded-2xl">
                    <div className="flex gap-4 items-center text-slate-400">
                        <span className="bg-cyan-200 text-cyan-500 h-20 w-20 rounded-3xl text-5xl flex justify-center items-center">{data.icon}</span>
                        <div className="flex flex-col gap-2">
                            <span className=" flex w-fit  items-center gap-2 px-4 py-1.5 border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold  bg-cyan-50  text-[#0fb8c4] shadow-sm new">
                                <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse"></span>
                                {data.department}
                            </span>
                            <h2 className="text-[30px] font-[700]">{data.title}</h2>
                            <div className='flex gap-6 col-span-2'>
                                <span className='flex justify-center items-center gap-1'><CiLocationOn />
                                    <span className='text-[14.5px]'>
                                        {data.location}
                                    </span>
                                </span>
                                <span className='flex justify-center items-center gap-1'><PiToolboxLight />
                                    <span className='text-[14.5px]'>
                                        {data.jobType}

                                    </span>
                                </span>
                                <span className='flex justify-center items-center gap-1 '>
                                    <VscGraph />
                                    <span className='text-[14.5px]'>
                                        {data.experience}

                                    </span>
                                </span>

                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <Link
                            onClick={() => scrollTo(0, 0)}
                            to='/PayPal' className="btn btn-primary">Apply Now
                            <svg className="arr" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                        </Link>
                        <Link to='/Form' className="btn btn-ghost flex  justify-center"
                            onClick={() => window.scrollTo(0, 0)}>Save Job</Link>

                    </div>
                </div>

            </div>

            {/* Job Overview */}
            <div className="mt-10 space-y-4 border rounded-3xl bg-white border-slate-200 ">

                <section className="bg-white  rounded-3xl p-8">
                    <h2 className="text-xl font-[700] text-[#043264] mb-4">
                        {data.overview.title}
                    </h2>

                    <p className="text-slate-400 leading-8">
                        {data.overview.desc}
                    </p>
                </section>

                {/* Responsibilities */}
                <section className="bg-white  mx-8 py-8 border-slate-100 border-t">
                    <h2 className="text-xl font-[700] text-[#043264] mb-6">
                        {data.responsibilities.title}
                    </h2>

                    <ul className="space-y-4">
                        {data.responsibilities.points.map((item, index) => (
                            <li key={index} className="flex   gap-3">
                                <span className="w-2 h-2 rounded-full bg-cyan-500 mt-3 shrink-0" />
                                <span className="text-slate-400">{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Requirements */}
                <section className="bg-white border-t border-slate-200 mx-8 py-8">
                    <h2 className="text-xl font-[700] text-[#043264] mb-6">
                        {data.requirements.title}
                    </h2>

                    <ul className="space-y-4">
                        {data.requirements.points.map((item, index) => (
                            <li key={index} className="flex gap-3">
                                <span className="w-2 h-2 rounded-full bg-[#33bf8b] mt-3 shrink-0"></span>
                                <span className="text-slate-400">{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Preferred Qualifications */}
                {data.preferredQualifications && (
                    <section className="bg-white border-t border-slate-200 mx-8 py-8">
                        <h2 className="text-xl font-[700] text-[#043264] mb-6">
                            {data.preferredQualifications.title}
                        </h2>

                        <ul className="space-y-4">
                            {data.preferredQualifications.points.map((item, index) => (
                                <li key={index} className="flex gap-3">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-3 shrink-0"></span>
                                    <span className="text-slate-400">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Benefits */}
                <section className="bg-gradient-to-br from-cyan-50 to-green-50  p-8">
                    <h2 className="text-xl font-[700] text-[#043264] mb-8">
                        {data.benefits.title}
                    </h2>

                    <div className="grid md:grid-cols-2 gap-4">
                        {data.benefits.points.map((item, index) => (
                            <div
                                key={index}
                                className="bg-white rounded-2xl p-4 border border-white shadow-sm"
                            >
                                {item}
                            </div>
                        ))}
                    </div>
                </section>

                {/* About Company */}
                <section className="bg-white   mx-8 py-8">
                    <h2 className="text-xl font-[700] text-[#043264] mb-4">
                        {data.aboutCompany.title}
                    </h2>

                    <p className="text-slate-400 leading-8">
                        {data.aboutCompany.desc}
                    </p>
                </section>

                {/* Hiring Process */}
                <section className=" border-t border-slate-200 mx-8 py-8">
                    <h2 className="text-xl font-[700] text-[#043264] mb-8">
                        Hiring Process
                    </h2>

                    <div className="grid md:grid-cols-5 gap-5">
                        {data.hiringProcess.map((step, index) => (
                            <div key={index}>
                                <div className="w-14 h-14 rounded-full bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white flex items-center justify-center font-bold">
                                    {step.step}
                                </div>

                                <h4 className="font-semibold text-[#043264] mt-4">
                                    {step.title}
                                </h4>

                                <p className="text-sm text-slate-400 mt-2">
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}


            </div>
            <section className="rounded-[32px] bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] mt-8 p-10">
                <div className="flex relative flex-col md:flex-row justify-between items-center gap-6">
                    <div className="absolute top-[-160px] left-[-80px] w-[360px] h-[360px] bg-white/10 rounded-full pointer-events-none" />
                    <div className="absolute bottom-[-140px] right-[-50px] w-[280px] h-[280px] bg-white/5 rounded-full pointer-events-none" />
                    <div>
                        <span className="text-3xl font-bold text-white">
                            Ready to build the future with us?
                        </span>

                        <p className="text-white/90 mt-2">
                            Join a team that values ownership,
                            innovation, and growth.
                        </p>
                    </div>

                    <Link
                        to="/Form"
                        className="px-8 py-4 bg-white rounded-xl text-[#043264] font-semibold"
                    >
                        Apply Now
                    </Link>
                </div>
            </section>




        </div>
    )
}

export default Hero