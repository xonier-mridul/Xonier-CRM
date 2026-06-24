import React from "react";

const FinalCTA = () => {
    return (
        <section
            className="sec"
            style={{ paddingTop: "0" }}
        >
            <div className="wrap">
                <div className="finalcta">
                    {/* HEADING */}
                    <h2>
                        Ready to see everything your team is
                        doing?
                    </h2>

                    {/* SUBTEXT */}
                    <p>
                        Join 10,000+ teams running tasks,
                        sales, and support in one place.
                    </p>

                    {/* BUTTON */}
                    <a
                        href="#"
                        className="btn btn-white"
                    >
                        Start your free trial

                        <svg
                            className="arr"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M5 12h14M13 6l6 6-6 6"
                                stroke="currentColor"
                                strokeWidth="2.4"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </a>

                    {/* NOTE */}
                    <div className="note">
                        No credit card required · 14-day
                        Growth trial · Cancel anytime
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FinalCTA;