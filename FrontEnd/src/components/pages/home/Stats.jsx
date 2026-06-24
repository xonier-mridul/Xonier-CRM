import React, { useEffect, useRef, useState } from "react";
import Counter from "../../common/Counter";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger)

const Stats = () => {
    const wrapRef = useRef(null)
    const [start, setStart] = useState(false)
    useEffect(() => {
        ScrollTrigger.create({
            trigger: wrapRef.current,
            start: "top 80%",
            once: true,
            onEnter: () => setStart(true),
        });

        gsap.from('.stat', {
            duration: 1,
            scrollTrigger: {
                trigger: wrapRef.current,
                start: 'top 80%'
            }

        })

    }, [])
    return (
        <section className="sec">
            <div
                ref={wrapRef}
                className="wrap">
                <div className="statband mx-4">
                    {/* STAT 1 */}
                    <div className="stat">
                        <div
                            className="num"

                        >
                            <Counter end={1000} start={start} />

                        </div>

                        <div className="lab">
                            Happy customers
                        </div>

                        <span className="stat-div"></span>
                    </div>

                    {/* STAT 2 */}
                    <div className="stat">
                        <div
                            className="num"
                        >
                            <Counter end={5000} start={start} />

                        </div>

                        <div className="lab">
                            Tasks tracked daily
                        </div>

                        <span className="stat-div"></span>
                    </div>

                    {/* STAT 3 */}
                    <div className="stat">
                        <div
                            className="num"

                        >
                            <Counter end={99.9} start={start} /> %


                        </div>

                        <div className="lab">
                            System uptime
                        </div>

                        <span className="stat-div"></span>
                    </div>

                    {/* STAT 4 */}
                    <div className="stat">
                        <div
                            className="num"
                        >
                            <Counter end={120} start={start} />

                        </div>

                        <div className="lab">
                            Countries served
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Stats;