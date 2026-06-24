import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis } from 'recharts'


gsap.registerPlugin(ScrollTrigger)




const barsData = [
    { day: "Mon", height: "45" },
    { day: "Tue", height: "62" },
    { day: "Wed", height: "50" },
    { day: "Thu", height: "78" },
    { day: "Fri", height: "90" },
    { day: "Sat", height: "70" },
];




const Performance = () => {
    const rightRef = useRef(null)
    const leftRef = useRef(null)
    const chartRef = useRef(null)
    const [showChart, setShowChart] = useState(false)

    useEffect(() => {

        ScrollTrigger.create({
            trigger: chartRef.current,
            start: 'top 80%',
            once: true,
            onEnter: () => setShowChart(true)
        })

        gsap.fromTo(
            '.leftVisual',
            {
                x: -80,
                opacity: 0,
            },
            {
                x: 0,
                opacity: 1,
                duration: 1.2,
                ease: 'power4.out',

                scrollTrigger: {
                    trigger: leftRef.current,
                    start: 'top 80%',
                    once: true,
                    toggleActions: 'play none none reverse',
                }
            }
        );

        gsap.fromTo(
            '.rightVisual',
            {
                x: 80,
                opacity: 0,
                scale: 0.9,
            },
            {
                x: 0,
                opacity: 1,
                scale: 1,
                duration: 1.2,
                ease: 'power4.out',

                scrollTrigger: {
                    trigger: rightRef.current,
                    start: 'top 80%',
                    toggleActions: 'play none none reverse',
                    once: true,

                }
            }
        );

    }, []);
    return (
        <>
            <div
                className="sec px-4"
                style={{ paddingTop: 0 }}
            >
                <div className="wrap ">
                    <div className="track ">
                        {/* LEFT CONTENT */}
                        <div className="track-copy leftVisual"
                            ref={leftRef}>
                            <span className="eyebrow">
                                Performance, measured
                            </span>

                            <h2 className="text-3xl md:text-4xl">
                                Every task tells you{" "}
                                <span className="grad-text">
                                    who, what & how well.
                                </span>
                            </h2>

                            <p className="lead">
                                Trakeroo turns daily work into clear
                                performance signals — so managers see
                                contribution at a glance and teams stay
                                accountable without micromanagement.
                            </p>

                            <div className="track-list">
                                {/* ITEM 1 */}
                                <div className="track-item">
                                    <span className="track-num">1</span>

                                    <div>
                                        <h4>
                                            Work gets logged automatically
                                        </h4>

                                        <p>
                                            Every task, deal, and ticket is
                                            attributed to an owner the moment
                                            it's created.
                                        </p>
                                    </div>
                                </div>

                                {/* ITEM 2 */}
                                <div className="track-item">
                                    <span className="track-num">2</span>

                                    <div>
                                        <h4>
                                            Progress is measured in real time
                                        </h4>

                                        <p>
                                            Velocity, response times, and
                                            close rates update live across
                                            every team.
                                        </p>
                                    </div>
                                </div>

                                {/* ITEM 3 */}
                                <div className="track-item">
                                    <span className="track-num">3</span>

                                    <div>
                                        <h4>
                                            Performance becomes visible
                                        </h4>

                                        <p>
                                            Individual and team dashboards
                                            show output, trends, and
                                            bottlenecks instantly.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT VISUAL */}
                        <div className="track-visual rightVisual"
                            ref={rightRef}>
                            <div className="tv-head">
                                <h5>Team Performance</h5>

                                <span className="tg">
                                    ▲ 38% this month
                                </span>
                            </div>


                            <div className="w-full"
                                ref={chartRef}>
                                {
                                    showChart && (
                                        <BarChart width='100%' height={200} data={barsData}>
                                            <YAxis />
                                            <XAxis
                                                dataKey='day' />
                                            <Bar
                                                fill="#8884d8"
                                                dataKey='height'
                                                barSize={30}
                                                animationBegin={0}
                                                animationDuration={2000}
                                                animationEasing="ease-out" />
                                        </BarChart>
                                    )

                                }

                            </div>




                            {/* STATS */}
                            <div className="tv-stats">
                                <div className="tv-stat">
                                    <div className="n">142</div>
                                    <div className="l">Tasks done</div>
                                </div>

                                <div className="tv-stat">
                                    <div className="n">96%</div>
                                    <div className="l">On-time SLA</div>
                                </div>

                                <div className="tv-stat">
                                    <div className="n">$84k</div>
                                    <div className="l">Closed</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Performance;