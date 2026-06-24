import { Mail } from 'lucide-react';
import React from 'react'
import { FaLinkedin, FaTwitter } from 'react-icons/fa';
import CEO from '../../../assets/teamDK.jpeg';
import Adarsh from '../../../assets/adarsh.jpg';
import Ashraf from '../../../assets/ashraf.jpeg'

const team = [
    {
        name: "Dhirendra Kumar",
        role: "CEO & Co-Founder",
        image: CEO,
        twitter: "#",
        linkedin: "#",
    },
    {
        name: "Ashraf Ali",
        role: "Project Manager",
        image: Ashraf,
        twitter: "#",
        linkedin: "#",
    },
    {
        name: "Adarsh Anand",
        role: "Key Account Manager",
        image: Adarsh,
        twitter: "#",
        linkedin: "#",
    }
];


const Team = () => {
    return (
        <>
            <section className="py-24 max-w-[1200px] mx-auto px-7">
                <div className="text-center max-w-[680px] mx-auto mb-16">
                    <span className="inline-block bg-white border border-[#e3ebf2] rounded-full px-4 py-1.5 text-xs font-semibold text-[#0fb8c4] shadow-sm tracking-wide mb-4">
                        Leadership
                    </span>
                    <h2 className="font-sora text-3xl md:text-4xl font-bold text-[#15233b]">
                        Meet our <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">founding team.</span>
                    </h2>
                    <p className="mt-3 text-base text-[#5a6b86]">
                        A collective of designers, engineers, and product strategists working entirely to make product operations fluid.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {team.map((member, i) => (
                        <div key={i} className="bg-white border border-[#e3ebf2] rounded-2xl p-6 text-center transition-all duration-300 hover:shadow-[0_18px_50px_rgba(21,35,59,0.10)] hover:-translate-y-1">
                            <div className="w-[100px] h-[100px] rounded-full mx-auto mb-4 p-[3px] border-2 border-[#16c2cf]/30 overflow-hidden">
                                <img src={member.image} alt={member.name} className="w-full h-full object-cover rounded-full" />
                            </div>
                            <h3 className="font-sora text-lg font-semibold text-[#15233b]">{member.name}</h3>
                            <div className="text-xs text-[#0fb8c4] font-medium mb-4">{member.role}</div>

                            <div className="flex justify-center gap-3 text-[#94a3b8]">
                                <a href={member.linkedin} className="p-1.5 hover:text-[#0fb8c4] transition-colors duration-200">
                                    {/* <Linkedin  /> */}
                                    <FaLinkedin className="w-4 h-4" />
                                </a>
                                <a href={member.twitter} className="p-1.5 hover:text-[#0fb8c4] transition-colors duration-200">
                                    <FaTwitter className="w-4 h-4" />
                                    {/* <Twitter  /> */}
                                </a>
                                <a href="#" className="p-1.5 hover:text-[#0fb8c4] transition-colors duration-200">
                                    <Mail className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </>
    )
}

export default Team