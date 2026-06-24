import { useEffect, useRef } from "react";
import gsap from 'gsap'
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);


const Pillars = () => {
    const pillarRef = useRef(null)
    const cardRef = useRef(null)

    useEffect(() => {

        gsap.from('.company', {
            y: 50,
            opacity: 0,
            duration: 1,
            stagger: 0.25,
            ease: 'power3.out',

            scrollTrigger: {
                trigger: pillarRef.current,
                start: 'top 80%',
                once: true,
            }
        });



        gsap.fromTo(
            ".card",
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
                    trigger: cardRef.current,
                    start: "top 80%",
                },

            }

        );

    }, []);
    return (
        <>
            <section className="sec " id="pillars">
                <div className="wrap" >
                    {/* SECTION HEAD */}
                    <div ref={pillarRef} className="sec-head ">
                        <span className="eyebrow company">
                            One platform, three powers
                        </span>

                        <h2 className="company text-[30px] md:text-[40px]">
                            Three teams.{" "}
                            <span className="grad-text">
                                One source of truth.
                            </span>
                        </h2>

                        <p className="company">
                            Stop stitching together Jira, a CRM, and a help
                            desk. Trakeroo unifies how your whole company
                            works — and tracks it all in one place.
                        </p>
                    </div>

                    {/* PILLARS */}
                    <div
                        ref={cardRef}
                        className="pillars p-4 "
                    >
                        {/* TASK MANAGEMENT */}
                        <div className="pillar p1 card ">
                            <div className="pic">
                                <svg
                                    width="26"
                                    height="26"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <rect
                                        x="3"
                                        y="4"
                                        width="18"
                                        height="16"
                                        rx="2"
                                        stroke="#fff"
                                        strokeWidth="2"
                                    />

                                    <path
                                        d="M3 9h18M8 4v16"
                                        stroke="#fff"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </div>

                            <h3>Task Management</h3>

                            <p>
                                Jira-style boards, sprints, and roadmaps for
                                your product & engineering teams.
                            </p>

                            <ul>
                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Kanban, scrum & timeline views
                                </li>

                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Sprints & backlog grooming
                                </li>

                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Custom workflows & automations
                                </li>
                            </ul>
                        </div>

                        {/* SALES CRM */}
                        <div className="pillar p2 card  ">
                            <div className="pic">
                                <svg
                                    width="26"
                                    height="26"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"
                                        stroke="#fff"
                                        strokeWidth="2"
                                    />

                                    <path
                                        d="M3 21a9 9 0 0118 0"
                                        stroke="#fff"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>

                            <h3>Sales CRM</h3>

                            <p>
                                Visual pipelines, deal tracking, and contact
                                management built for closers.
                            </p>

                            <ul>
                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Drag-and-drop deal pipelines
                                </li>

                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Lead scoring & follow-up reminders
                                </li>

                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Revenue forecasting
                                </li>
                            </ul>
                        </div>

                        {/* SUPPORT TICKETS */}
                        <div className="pillar p3 card">
                            <div className="pic">
                                <svg
                                    width="26"
                                    height="26"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                                        stroke="#fff"
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>

                            <h3>Support Tickets</h3>

                            <p>
                                A help desk that ties customer issues straight
                                back to the dev backlog.
                            </p>

                            <ul>
                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Shared inbox & SLA timers
                                </li>

                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    Convert tickets to dev tasks
                                </li>

                                <li>
                                    <svg
                                        className="pcheck"
                                        width="17"
                                        height="17"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M5 13l4 4L19 7"
                                            stroke="currentColor"
                                            strokeWidth="2.6"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                    CSAT & response analytics
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default Pillars;