import React from "react";

const FAQ = () => {
    return (
        <section
            className="sec"
            style={{ paddingTop: "80px" }}
        >
            <div className="wrap">
                {/* SECTION HEAD */}
                <div className="sec-head ">
                    <span className="eyebrow">
                        FAQ
                    </span>

                    <h2 className="text-3xl md:text-4xl">
                        Questions?{" "}
                        <span className="grad-text">
                            We've got answers.
                        </span>
                    </h2>
                </div>

                {/* FAQ WRAP */}
                <div className="faq-wrap">
                    {/* FAQ 1 */}
                    <details
                        className="faq "
                        open
                    >
                        <summary>
                            How is Trakeroo different from Jira
                            or a standalone CRM?

                            <span className="ico">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M12 5v14M5 12h14"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </summary>

                        <div className="ans">
                            Most teams run a project tool, a
                            separate CRM, and a help desk that
                            never talk to each other. Trakeroo
                            combines all three so a support
                            ticket can become a dev task, and a
                            closed deal can kick off an
                            onboarding project — all tracked in
                            one workspace.
                        </div>
                    </details>

                    {/* FAQ 2 */}
                    <details className="faq ">
                        <summary>
                            Can I migrate my existing data?

                            <span className="ico">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M12 5v14M5 12h14"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </summary>

                        <div className="ans">
                            Yes. We offer one-click importers for
                            Jira, Trello, HubSpot, Zendesk, and
                            CSV files. Our team can also help
                            with white-glove migration on Growth
                            and Enterprise plans.
                        </div>
                    </details>

                    {/* FAQ 3 */}
                    <details className="faq ">
                        <summary>
                            Does "tracking" mean you monitor
                            employees?

                            <span className="ico">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M12 5v14M5 12h14"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </summary>

                        <div className="ans">
                            Trakeroo tracks work — tasks, deals,
                            and tickets — not keystrokes or
                            screens. The goal is visibility and
                            accountability, giving credit for
                            contribution rather than surveilling
                            people.
                        </div>
                    </details>

                    {/* FAQ 4 */}
                    <details className="faq ">
                        <summary>
                            Is there a free plan?

                            <span className="ico">
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M12 5v14M5 12h14"
                                        stroke="currentColor"
                                        strokeWidth="2.4"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </summary>

                        <div className="ans">
                            Absolutely. Our Starter plan is free
                            forever for up to 5 users and
                            includes task boards, a basic CRM
                            pipeline, and 100 support tickets
                            per month.
                        </div>
                    </details>
                </div>
            </div>
        </section>
    );
};

export default FAQ;