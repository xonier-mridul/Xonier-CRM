import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, TrendingUp, Globe2, Eye } from 'lucide-react';
import gsap from 'gsap';

const timelineData = [
    {
        id: 0,
        year: "2022",
        title: "The Spark",
        desc: "Trakeroo was founded to solve the fragmentation of modern SaaS stacks by designing a predictive, unified semantic layer.",
        tag: "Inception",
        statValue: "1st Commit",
        statLabel: "Architecture Framework Deployed",
        bulletPoints: ["Unified API integrations", "Cross-stack data routing maps", "Initial platform concept wireframes"]
    },
    {
        id: 1,
        year: "2023",
        title: "Seed Funding & Launch",
        desc: "Raised $4.2M and launched our core unified workflow engine to early adopters, stripping out cross-app workflow latency by 40%.",
        tag: "Growth",
        statValue: "$4.2M",
        statLabel: "Seed Round Capitally Secured",
        bulletPoints: ["Launched public beta engine", "Acquired first 500 enterprise clusters", "Decreased operational sync lag by 40%"]
    },
    {
        id: 2,
        year: "2024",
        title: "Scaling Global Teams",
        desc: "Surpassed 50,000 active daily tasks tracked across 120+ countries, fully parsing structured data clusters seamlessly.",
        tag: "Milestone",
        statValue: "50k+",
        statLabel: "Daily Active Tasks Tracked",
        bulletPoints: ["International data nodes scaled", "Multi-region fallback structures", "99.98% platform runtime stability achieved"]
    },
    {
        id: 3,
        year: "2026",
        title: "The Path Forward",
        desc: "Continuously pioneering zero-friction, fully context-aware organizational sandboxes that mitigate system bottlenecks ahead of runtime.",
        tag: "Vision",
        statValue: "100%",
        statLabel: "Lightweight Architecture Goal",
        bulletPoints: ["Predictive task assignment engines", "Universal context mesh filters", "Zero-latency remote workspace systems"]
    }
];

const Story = () => {
    const [activeStep, setActiveStep] = useState(0);

    const teamRef = useRef(null)

    useEffect(() => {
        gsap.fromTo('.new1', {
            y: 60,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power2.inOut',
                duration: 2,
                scrollTrigger: {
                    trigger: teamRef.current,
                    start: 'top 80%'
                }

            }
        )
        gsap.fromTo('.left', {
            x: -50,
            opacity: 0
        },
            {
                x: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power3.inOut',
                duration: 2,
                scrollTrigger: {
                    trigger: teamRef.current,
                    start: 'top 80%'

                }

            }
        )

        gsap.fromTo('.right', {
            x: 90,
            opacity: 0
        },
            {
                x: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power3.inOut',
                duration: 2,
                scrollTrigger: {
                    trigger: teamRef.current,
                    start: 'top 80%'

                }

            }
        )



    }, [])

    return (
        <section className="py-20 bg-[#f1f6fb] relative ">
            <div
                className="absolute inset-0 opacity-[0.15] mix-blend-multiply pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#16c2cf 1px, transparent 1px)',
                    backgroundSize: '24px 24px'
                }}
            />
            {/* Soft Ambient Background Spotlights */}
            <div className="absolute top-1/4 -left-32 w-96 h-96 bg-gradient-to-br from-[#16c2cf]/10 to-transparent rounded-full blur-[130px] pointer-events-none" />
            <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] bg-gradient-to-tl from-[#0fb8a5]/10 to-transparent rounded-full blur-[150px] pointer-events-none" />

            <div
                ref={teamRef}
                className="max-w-[1200px] mx-auto px-7 relative z-10">
                <div className="flex flex-col justify-center items-center pb-10">
                    <span className="inline-flex items-center gap-1.5 bg-white border border-[#e3ebf2] rounded-full px-4 py-1.5 text-xs font-semibold text-[#0fb8c4] shadow-[0_2px_12px_rgba(22,194,207,0.06)] tracking-wide mb-5 new1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16c2cf]" />
                        Our Journey
                    </span>
                    <h2 className="font-sora text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#15233b] tracking-tight leading-[1.2] mb-5 new1">
                        How we built {' '}
                        <span className="bg-gradient-to-r from-[#16c2cf] via-[#0fb8c4] to-[#0fb8a5] bg-clip-text text-transparent">
                            Trakeroo.
                        </span>
                    </h2>
                    <p className="text-[#5a6b86] text-[16px] leading-relaxed max-w-xl text-center new1">
                        From a small design wireframe to a highly stable ecosystem supporting complex engineering and product operations teams globally. We're just scratching the surface.
                    </p>
                </div>
                <div


                    className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">

                    {/* Left Hand: Interactive Navigation Nodes Track */}
                    <div className="lg:col-span-7 relative pl-4 sm:pl-10 space-y-5 left">

                        {/* Interactive Main Progress Bar Line */}
                        <div className="absolute inset-y-4 left-[19px] lg:left-15 sm:left-[39px] w-[2px] bg-[#e3ebf2]" />

                        {timelineData.map((item) => {
                            const isSelected = activeStep === item.id;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setActiveStep(item.id)}
                                    className="relative pl-10 sm:pl-14 group cursor-pointer select-none"
                                >
                                    {/* Concentric Timeline Click Indicator Node Rings */}
                                    <div className={`absolute left-0 sm:left-4 top-[26px] w-[11px] h-[11px] rounded-full z-20 transition-all duration-300 ${isSelected ? 'bg-white ring-4 ring-[#0fb8a5] scale-110 shadow-sm' : 'bg-white ring-4 ring-[#16c2cf] group-hover:ring-[#0fb8a5]'
                                        }`} />

                                    <div className={`absolute left-[-5px] sm:left-2 lg:left-[11px] top-[21px] w-[21px] h-[21px] rounded-full border border-[#16c2cf]/30 bg-[#16c2cf]/5 z-10 transition-all duration-500 ${isSelected ? 'opacity-100 scale-150' : 'opacity-0 group-hover:opacity-100 group-hover:scale-125'
                                        } pointer-events-none`} />

                                    {/* Micro glassmorphism data card items */}
                                    <div className={`border rounded-2xl p-6 transition-all duration-300 transform ${isSelected
                                        ? 'bg-white border-[#16c2cf]/40 shadow-[0_12px_32px_rgba(21,35,59,0.05)] -translate-y-0.5'
                                        : 'bg-white/60 backdrop-blur-sm border-[#e3ebf2] hover:bg-white/95 hover:border-[#16c2cf]/40 hover:shadow-[0_8px_24px_rgba(21,35,59,0.02)]'
                                        }`}>
                                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                                            <span className={`font-sora text-2xl font-extrabold tracking-tight transition-colors duration-200 ${isSelected ? 'bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent' : 'text-[#94a3b8]'
                                                }`}>
                                                {item.year}
                                            </span>
                                            <span className="text-[10px] font-bold text-[#5a6b86] uppercase tracking-widest bg-[#f1f6fb] px-2.5 py-0.5 rounded-md border border-[#e3ebf2]">
                                                {item.tag}
                                            </span>
                                        </div>

                                        <h4 className={`font-sora text-base sm:text-lg font-bold transition-colors duration-200 flex items-center justify-between ${isSelected ? 'text-[#15233b]' : 'text-[#33415c] group-hover:text-[#16c2cf]'
                                            }`}>
                                            {item.title}
                                            <ArrowUpRight className={`w-4 h-4 transition-transform duration-300 ${isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0'
                                                } text-[#0fb8c4]`} />
                                        </h4>
                                        <p className="text-sm text-[#5a6b86] leading-relaxed line-clamp-2 md:line-clamp-none">
                                            {item.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Right Hand Side: Dynamic Context Analytics Panel View */}
                    <div className="lg:col-span-5 lg:sticky lg:top-26 bg-white border border-[#e3ebf2] rounded-3xl p-6 md:p-8 shadow-[0_16px_48px_rgba(21,35,59,0.04)] relative overflow-hidden flex flex-col right justify-between min-h-[440px]">

                        {/* Soft interior decorative gradient strip along the top card fold */}
                        <div className="absolute top-0 inset-x-0 h-[4px] bg-gradient-to-r from-[#16c2cf] via-[#0fb8c4] to-[#0fb8a5]" />

                        <div>
                            {/* Panel Structural Card Badge Header */}
                            <div className="flex items-center justify-between pb-5 mb-5 border-b border-[#e3ebf2]">
                                <span className="font-sora text-sm font-bold text-[#15233b] flex items-center gap-2">
                                    <Eye className="w-4 h-4 text-[#16c2cf]" />
                                    Era Overview Matrix
                                </span>
                                <span className="text-xs text-[#0fb8c4] bg-[#16c2cf]/10 px-3 py-1 rounded-full font-semibold">
                                    {timelineData[activeStep].year} Phase
                                </span>
                            </div>

                            {/* Core Highlight Callout Metric Box */}
                            <div className="mb-6 bg-[#f1f6fb] border border-[#e3ebf2] rounded-2xl p-5 flex items-start gap-4 transition-all duration-300">
                                <div className="p-3 bg-white rounded-xl shadow-sm border border-[#e3ebf2] text-[#0fb8c4]">
                                    {activeStep === 0 && <CheckCircle2 className="w-5 h-5" />}
                                    {activeStep === 1 && <TrendingUp className="w-5 h-5" />}
                                    {activeStep === 2 && <Globe2 className="w-5 h-5" />}
                                    {activeStep === 3 && <CheckCircle2 className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="font-sora text-2xl font-extrabold text-[#15233b] tracking-tight leading-none mb-1">
                                        {timelineData[activeStep].statValue}
                                    </div>
                                    <div className="text-xs font-medium text-[#5a6b86]">
                                        {timelineData[activeStep].statLabel}
                                    </div>
                                </div>
                            </div>

                            {/* Chronological Segment Task Bullet List Render */}
                            <div className="space-y-3">
                                <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Key Milestones Achieved</div>
                                <ul className="space-y-2.5">
                                    {timelineData[activeStep].bulletPoints.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-2.5 text-sm text-[#33415c] leading-snug">
                                            <span className="w-1.5 h-1.5 rounded-full bg-[#16c2cf] mt-2 flex-shrink-0" />
                                            <span>{bullet}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Interactive Static Interactive Matrix Footer Node */}
                        <div className="mt-8 pt-4 border-t border-[#e3ebf2] flex items-center justify-between text-xs text-[#94a3b8]">
                            <span>Click timeline cards to pivot view</span>
                            <span className="font-semibold text-[#0fb8c4]">Trakeroo Workspace Log</span>
                        </div>
                    </div>






                </div>
            </div>
        </section>
    );
};

export default Story;