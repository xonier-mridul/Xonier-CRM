import React from "react";

const Team = () => {
    return (
        <section className="sec" id="team">
            <div className="wrap p-4">
                {/* SECTION HEAD */}
                <div className="sec-head ">
                    <span className="eyebrow">
                        Our team
                    </span>

                    <h2 className="text-3xl md:text-4xl">
                        Meet the people{" "}
                        <span className="grad-text">
                            behind Trakeroo.
                        </span>
                    </h2>
                </div>

                {/* TEAM ROW */}
                <div className="teamrow">
                    {/* MEMBER 1 */}
                    <div className="tmcard ">
                        <div
                            className="pf"
                            style={{
                                backgroundImage:
                                    "url('https://i.pravatar.cc/180?img=47')",
                            }}
                        ></div>

                        <div className="nm">
                            Anjali Sharma
                        </div>

                        <div className="rl">
                            Head of Product
                        </div>

                        <div className="tmsoc">
                            {/* LINKEDIN */}
                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 17.34V10.2H6.06v7.14h2.28zM7.2 9.18a1.32 1.32 0 100-2.64 1.32 1.32 0 000 2.64zm10.14 8.16v-3.92c0-2.1-.45-3.7-2.9-3.7-1.18 0-1.97.64-2.3 1.26h-.03V10.2H9.9v7.14h2.28v-3.53c0-.93.18-1.84 1.34-1.84 1.14 0 1.16 1.07 1.16 1.9v3.47h2.66z" />
                                </svg>
                            </a>

                            {/* TWITTER */}
                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M22 5.8a8.5 8.5 0 01-2.36.65 4.13 4.13 0 001.81-2.27 8.2 8.2 0 01-2.6 1 4.1 4.1 0 00-7 3.74A11.64 11.64 0 013.4 4.5a4.1 4.1 0 001.27 5.48A4 4 0 012.8 9.5v.05a4.1 4.1 0 003.3 4.02 4.1 4.1 0 01-1.85.07 4.1 4.1 0 003.83 2.85A8.23 8.23 0 012 18.3a11.6 11.6 0 006.29 1.84c7.55 0 11.67-6.25 11.67-11.67v-.53A8.3 8.3 0 0022 5.8z" />
                                </svg>
                            </a>

                            {/* EMAIL */}
                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="14"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />

                                    <path
                                        d="M3 7l9 6 9-6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* MEMBER 2 */}
                    <div className="tmcard ">
                        <div
                            className="pf"
                            style={{
                                backgroundImage:
                                    "url('https://i.pravatar.cc/180?img=11')",
                            }}
                        ></div>

                        <div className="nm">
                            Vikram Mehta
                        </div>

                        <div className="rl">
                            Head of Engineering
                        </div>

                        <div className="tmsoc">
                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 17.34V10.2H6.06v7.14h2.28zM7.2 9.18a1.32 1.32 0 100-2.64 1.32 1.32 0 000 2.64zm10.14 8.16v-3.92c0-2.1-.45-3.7-2.9-3.7-1.18 0-1.97.64-2.3 1.26h-.03V10.2H9.9v7.14h2.28v-3.53c0-.93.18-1.84 1.34-1.84 1.14 0 1.16 1.07 1.16 1.9v3.47h2.66z" />
                                </svg>
                            </a>

                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M22 5.8a8.5 8.5 0 01-2.36.65 4.13 4.13 0 001.81-2.27 8.2 8.2 0 01-2.6 1 4.1 4.1 0 00-7 3.74A11.64 11.64 0 013.4 4.5a4.1 4.1 0 001.27 5.48A4 4 0 012.8 9.5v.05a4.1 4.1 0 003.3 4.02 4.1 4.1 0 01-1.85.07 4.1 4.1 0 003.83 2.85A8.23 8.23 0 012 18.3a11.6 11.6 0 006.29 1.84c7.55 0 11.67-6.25 11.67-11.67v-.53A8.3 8.3 0 0022 5.8z" />
                                </svg>
                            </a>

                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="14"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />

                                    <path
                                        d="M3 7l9 6 9-6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* MEMBER 3 */}
                    <div className="tmcard ">
                        <div
                            className="pf"
                            style={{
                                backgroundImage:
                                    "url('https://i.pravatar.cc/180?img=20')",
                            }}
                        ></div>

                        <div className="nm">
                            Neha Verma
                        </div>

                        <div className="rl">
                            Customer Success Lead
                        </div>

                        <div className="tmsoc">
                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 17.34V10.2H6.06v7.14h2.28zM7.2 9.18a1.32 1.32 0 100-2.64 1.32 1.32 0 000 2.64zm10.14 8.16v-3.92c0-2.1-.45-3.7-2.9-3.7-1.18 0-1.97.64-2.3 1.26h-.03V10.2H9.9v7.14h2.28v-3.53c0-.93.18-1.84 1.34-1.84 1.14 0 1.16 1.07 1.16 1.9v3.47h2.66z" />
                                </svg>
                            </a>

                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M22 5.8a8.5 8.5 0 01-2.36.65 4.13 4.13 0 001.81-2.27 8.2 8.2 0 01-2.6 1 4.1 4.1 0 00-7 3.74A11.64 11.64 0 013.4 4.5a4.1 4.1 0 001.27 5.48A4 4 0 012.8 9.5v.05a4.1 4.1 0 003.3 4.02 4.1 4.1 0 01-1.85.07 4.1 4.1 0 003.83 2.85A8.23 8.23 0 012 18.3a11.6 11.6 0 006.29 1.84c7.55 0 11.67-6.25 11.67-11.67v-.53A8.3 8.3 0 0022 5.8z" />
                                </svg>
                            </a>

                            <a href="#">
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <rect
                                        x="3"
                                        y="5"
                                        width="18"
                                        height="14"
                                        rx="2"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />

                                    <path
                                        d="M3 7l9 6 9-6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Team;