import React from "react";
import logo from '../../assets/logo2.png'
import Product from "../pages/footer/Product";
import Company from "../pages/footer/Company";
import { Link } from "react-router-dom";

const Footer = () => {
    return (
        <footer>
            <div className="wrap">
                {/* MAIN FOOTER GRID */}
                <div className="fgrid-main">
                    {/* BRAND */}
                    <div className="col-span-2 md:col-span-1">
                        <Link to='/' onClick={() => window.scrollTo(0, 0)} className="logo">
                            <span className="h-10 ">
                                <img src={logo} alt="logo" className='object-cover h-full' />
                            </span>

                        </Link>

                        <p className="my-5">
                            The modern platform that helps you
                            manage your business, track
                            performance, and grow — all in one
                            place.
                        </p>

                        {/* SOCIALS */}
                        <div className="fsoc">
                            {/* FACEBOOK */}
                            <a href="https://www.facebook.com/xoniertechInc/">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M14 9h3V5h-3c-2.2 0-4 1.8-4 4v2H7v4h3v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1z" />
                                </svg>
                            </a>

                            {/* TWITTER */}
                            <a href="https://x.com/xonier_tech">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M22 5.8a8.5 8.5 0 01-2.36.65 4.13 4.13 0 001.81-2.27 8.2 8.2 0 01-2.6 1 4.1 4.1 0 00-7 3.74A11.64 11.64 0 013.4 4.5a4.1 4.1 0 001.27 5.48A4 4 0 012.8 9.5v.05a4.1 4.1 0 003.3 4.02 4.1 4.1 0 01-1.85.07 4.1 4.1 0 003.83 2.85A8.23 8.23 0 012 18.3a11.6 11.6 0 006.29 1.84c7.55 0 11.67-6.25 11.67-11.67v-.53A8.3 8.3 0 0022 5.8z" />
                                </svg>
                            </a>

                            {/* LINKEDIN */}
                            <a href="https://www.linkedin.com/company/xoniertechnologies">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                >
                                    <path d="M19 3a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14zM8.34 17.34V10.2H6.06v7.14h2.28zM7.2 9.18a1.32 1.32 0 100-2.64 1.32 1.32 0 000 2.64zm10.14 8.16v-3.92c0-2.1-.45-3.7-2.9-3.7-1.18 0-1.97.64-2.3 1.26h-.03V10.2H9.9v7.14h2.28v-3.53c0-.93.18-1.84 1.34-1.84 1.14 0 1.16 1.07 1.16 1.9v3.47h2.66z" />
                                </svg>
                            </a>

                            {/* INSTAGRAM */}
                            <a href="https://www.instagram.com/xoniertechinc/">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <rect
                                        x="3"
                                        y="3"
                                        width="18"
                                        height="18"
                                        rx="5"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />

                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="4"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    />

                                    <circle
                                        cx="17.5"
                                        cy="6.5"
                                        r="1.3"
                                        fill="currentColor"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* PRODUCT */}
                    <Product />


                    {/* COMPANY */}
                    <Company />

                    {/* NEWSLETTER */}
                    <div className="col-span-2 md:col-span-1">
                        <h5 className="mb-5">Newsletter</h5>

                        <span
                            style={{
                                fontSize: "14px",
                                color:
                                    "rgba(255,255,255,.85)",
                            }}
                            className=" "
                        >
                            Get product updates and tips,
                            straight to your inbox.
                        </span>

                        <div className="news-form mt-5">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                aria-label="Email"
                            />

                            <button aria-label="Subscribe">
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                >
                                    <path
                                        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* BOTTOM */}
                <div className="fbottom">
                    <div className="cr">
                        © 2026 Trakeroo. All rights
                        reserved.
                    </div>

                    <div className="links">
                        <a href="#">
                            Privacy Policy
                        </a>

                        <a href="#">
                            Terms of Use
                        </a>

                        <a href="#">
                            Refund Policy
                        </a>

                        <a href="#">Sitemap</a>
                    </div>

                    {/* PAYMENT */}
                    <div className="pays">
                        <span>VISA</span>
                        <span>MC</span>
                        <span>PayPal</span>
                        <span>AMEX</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;