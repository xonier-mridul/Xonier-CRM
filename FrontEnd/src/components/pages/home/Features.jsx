import { useEffect, useRef } from "react";
import gsap from 'gsap'
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger)

const Features = () => {

    const feaRef = useRef(null)

    useEffect(() => {
        gsap.fromTo(
            ".fea",
            {
                y: 50,
                opacity: 0,
            },
            {
                y: 0,
                opacity: 1,
                duration: 1.2,
                ease: "power2.out",
                stagger: 0.25,
                scrollTrigger: {
                    trigger: feaRef.current,
                    start: "top 80%",
                },

            }

        );
    })
    return (
        <section
            className="sec"
            id="features"
            style={{
                background: "var(--bg-soft)",
                borderRadius: 0,
            }}
        >
            <div
                ref={feaRef}
                className="wrap">
                {/* SECTION HEAD */}
                <div className="sec-head ">
                    <span className="eyebrow fea">
                        Why teams choose Trakeroo
                    </span>

                    <h2 className="fea text-3xl md:text-4xl">
                        Everything you need to grow,{" "}
                        <span className="grad-text">
                            in one platform.
                        </span>
                    </h2>

                    <p className="fea">
                        Powerful where it matters, simple where
                        it counts.
                    </p>
                </div>

                {/* FEATURES GRID */}
                <div className="fgrid p-4">
                    {/* CARD 1 */}
                    <div className="fcard fea ">
                        <div className="fic ">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                />

                                <path
                                    d="M9 12l2 2 4-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <h4>Enterprise-grade security</h4>

                        <p>
                            SOC 2, SSO, and role-based access keep
                            your data safe and compliant.
                        </p>
                    </div>

                    {/* CARD 2 */}
                    <div className="fcard fea ">
                        <div className="fic">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />

                                <path
                                    d="M12 7v5l3 3"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <h4>24/7 dedicated support</h4>

                        <p>
                            Real humans, not bots — our team is
                            always here to help you succeed.
                        </p>
                    </div>

                    {/* CARD 3 */}
                    <div className="fcard fea ">
                        <div className="fic">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M18 10h-1.26A8 8 0 109 20"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                                <path
                                    d="M16 16l2 2 4-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <h4>99.9% uptime</h4>

                        <p>
                            Reliable performance you can count on,
                            every single day.
                        </p>
                    </div>

                    {/* CARD 4 */}
                    <div className="fcard fea">
                        <div className="fic">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M4 20V10M10 20V4M16 20v-7M22 20H2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>

                        <h4>Powerful insights</h4>

                        <p>
                            Real-time dashboards and reports turn
                            activity into decisions.
                        </p>
                    </div>

                    {/* CARD 5 */}
                    <div className="fcard fea">
                        <div className="fic">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M14 7h5a2 2 0 012 2v6M10 17H5a2 2 0 01-2-2V9"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />

                                <rect
                                    x="7"
                                    y="3"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />

                                <rect
                                    x="11"
                                    y="15"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                />
                            </svg>
                        </div>

                        <h4>Seamless integrations</h4>

                        <p>
                            Connect Slack, GitHub, Gmail, and 100+
                            tools to automate your flow.
                        </p>
                    </div>

                    {/* CARD 6 */}
                    <div className="fcard fea">
                        <div className="fic">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>

                        <h4>Fast & scalable</h4>

                        <p>
                            Lightning-fast speed and infrastructure
                            built to grow with you.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Features;