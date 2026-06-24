import { Link, useParams } from 'react-router-dom'
import Counter from '../common/Counter'
import * as Icons from "lucide-react";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { productPages } from '../../data/footer';
import CTA from './CTA';

gsap.registerPlugin(ScrollTrigger)


const ProductPage = () => {

    const feaRef = useRef()
    const teamRef = useRef()
    const builtRef = useRef()
    const quesRef = useRef()
    const { slug } = useParams();

    useEffect(() => {

        gsap.fromTo('.new', {
            y: 50,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power3.inOut',
                duration: 1.2

            }
        )

        gsap.fromTo('.fea ', {
            y: 50,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power3.inOut',
                duration: 1.2,
                scrollTrigger: {
                    trigger: feaRef.current,
                    start: 'top 80%'

                }

            }
        )
        gsap.fromTo('.built', {
            y: 50,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power3.inOut',
                duration: 1.2,
                scrollTrigger: {
                    trigger: feaRef.current,
                    start: 'top 80%'

                }

            }
        )
        gsap.fromTo('.ques', {
            y: 50,
            opacity: 0
        },
            {
                y: 0,
                opacity: 1,
                stagger: 0.25,
                ease: 'power3.inOut',
                duration: 1.2,
                scrollTrigger: {
                    trigger: feaRef.current,
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
                duration: 1.2,
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
                duration: 1.2,
                scrollTrigger: {
                    trigger: teamRef.current,
                    start: 'top 80%'

                }

            }
        )

    }, [slug])

    const product = productPages.find(
        (item) => item.slug === slug
    );

    if (!product) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                Product Not Found
            </div>
        );
    }

    return (
        <main className="bg-[#f7fbfd]">

            <section className="relative bg-slate-200  overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#1ba2c3]/10 via-white to-[#33bf8b]/10" />

                <div className="max-w-7xl mx-auto px-6 py-20 relative z-10 flex  flex-col items-center ">
                    <span className="inline-flex px-4 py-2 rounded-full bg-white/80 text-[#1ba2c3] w-fit font-medium text-sm new">
                        {product.hero.badge}
                    </span>

                    <h1 className="mt-6 text-4xl lg:text-5xl font-bold text-[#043264] leading-tight text-center max-w-4xl new">
                        {product.hero.title}
                        <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                            {product.hero.title2}

                        </span>
                    </h1>

                    <p className="mt-6 text-lg text-slate-600 text-center max-w-2xl new">
                        {product.hero.desc}
                    </p>

                    <div className="mt-10 flex gap-4 flex-wrap new">
                        <Link to='/Paypal'>


                            <button className="px-7 py-4 rounded-xl bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] text-white font-semibold">
                                Start Free Trial
                            </button>
                        </Link>
                        <Link to='/Form'>
                            <button className="px-7 py-4 rounded-xl border border-slate-200 bg-white">
                                Book Demo
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* STATS */}



            <section className="max-w-[1200px] mx-auto px-7 -mt-12 relative z-20">
                <div className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5]  rounded-3xl p-8 md:p-12 shadow-[0_16px_40px_rgba(15,184,196,0.30)] relative overflow-hidden text-white grid grid-cols-2 md:grid-cols-3 gap-8 text-center">
                    <div
                        className="absolute flex  justify-center top-[-120px] right-[-60px] w-[300px] h-[300px] bg-white/10 rounded-full pointer-events-none" />
                    {
                        product.stats.map((i, ind) => {
                            return (
                                <div key={ind} className={`relative  ${i.style}`}>
                                    <div className="font-sora text-3xl md:text-4xl font-extrabold">
                                        <Counter end={30} start={`${i.number}`} start={true} />{i.suf}</div>
                                    <div className="text-sm opacity-90 mt-2">{i.label}</div>
                                </div>
                            )
                        })
                    }

                </div>
            </section>


            <section className="py-28">
                <div
                    ref={feaRef}
                    className="max-w-7xl mx-auto px-6">

                    <div className="text-center">
                        <h2 className="text-5xl font-bold text-[#043264] fea ">
                            Powerful{' '}
                            <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                                Features</span>
                        </h2>

                        <p className="mt-5 text-slate-600 max-w-2xl mx-auto fea">
                            Everything you need to manage work efficiently.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">

                        {product.features.map((feature, index) => {

                            const Icon =
                                Icons[feature.icon] ||
                                Icons.Circle;

                            return (
                                <div
                                    key={index}
                                    className="bg-white rounded-3xl fea p-7 border border-slate-100 hover:-translate-y-2 duration-300"
                                >
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                                        style={{
                                            backgroundColor:
                                                feature.bgColor,
                                        }}
                                    >
                                        <Icon
                                            size={28}
                                            color={feature.color}
                                        />
                                    </div>

                                    <h3 className="mt-6 text-xl font-semibold text-[#043264]">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-3 text-slate-500">
                                        {feature.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>


            <section className="bg-white py-28">
                <div className="max-w-7xl mx-auto px-6">

                    <div
                        ref={teamRef}
                        className="grid lg:grid-cols-2 gap-12 items-center">

                        <div className=''>
                            <h2 className="text-5xl font-bold text-[#043264] left">
                                Why Teams {' '}
                                <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent left">
                                    Love It</span>
                            </h2>

                            <p className="mt-6 text-slate-600 left">
                                Built to increase productivity,
                                improve collaboration, and help
                                organizations scale.
                            </p>
                        </div>

                        <div className="space-y-6">

                            {product.benefits.map(
                                (benefit, index) => {

                                    const Icon =
                                        Icons[benefit.icon] ||
                                        Icons.Circle;

                                    return (
                                        <div
                                            key={index}
                                            className="bg-[#f8fbfd] rounded-3xl p-6 flex gap-5 right"
                                        >
                                            <div>
                                                <Icon
                                                    size={30}
                                                    color={benefit.color}
                                                />
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h3 className="font-semibold text-[#043264]">
                                                        {benefit.title}
                                                    </h3>

                                                    <span className="text-xs px-3 py-1 rounded-full bg-[#1ba2c3]/10 text-[#1ba2c3]">
                                                        {benefit.stat}
                                                    </span>
                                                </div>

                                                <p className="text-slate-500 mt-2">
                                                    {benefit.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    </div>
                </div>
            </section>


            <section className="py-28">
                <div
                    ref={builtRef}
                    className="max-w-7xl mx-auto px-6">

                    <div className="text-center">
                        <h2 className="text-5xl font-bold text-[#043264] built">
                            Built For {' '}
                            <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                                Every Team</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mt-16">

                        {product.useCases.map(
                            (item, index) => {

                                const Icon =
                                    Icons[item.icon] ||
                                    Icons.Circle;

                                return (
                                    <div
                                        key={index}
                                        className="bg-white p-8 rounded-3xl shadow-sm built "
                                    >
                                        <Icon
                                            size={34}
                                            color={item.color}
                                        />

                                        <h3 className="mt-5 text-2xl font-semibold text-[#043264]">
                                            {item.title}
                                        </h3>

                                        <p className="mt-3 text-slate-500">
                                            {item.desc}
                                        </p>
                                    </div>
                                );
                            }
                        )}
                    </div>
                </div>
            </section>


            {product.faq && (
                <section className="bg-white py-24">
                    <div
                        ref={quesRef} className="max-w-4xl mx-auto px-6">

                        <h2 className="text-center text-5xl font-bold text-[#043264] ques">
                            Frequently Asked{' '}
                            <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">
                                Questions</span>
                        </h2>

                        <div className="mt-14 space-y-4">

                            {product.faq.map(
                                (faq, index) => (
                                    <details
                                        key={index}
                                        className="bg-[#f8fbfd] rounded-2xl p-6 ques"
                                    >
                                        <summary className="cursor-pointer font-semibold text-[#043264]">
                                            {faq.question}
                                        </summary>

                                        <p className="mt-4 text-slate-600">
                                            {faq.answer}
                                        </p>
                                    </details>
                                )
                            )}
                        </div>
                    </div>
                </section>
            )}

            <CTA title={'Ready to Get Started?'} desc={`Bring your projects, CRM, support,
                            and workflows together in one
                            powerful platform.`} btn={' Start Free Trial'} />


            {/* <section className="py-28">
                <div className="max-w-6xl mx-auto px-6">

                    <div className="rounded-[40px] overflow-hidden bg-gradient-to-r from-[#1ba2c3] to-[#33bf8b] p-16 text-center text-white">

                        <h2 className="text-5xl font-bold">
                            Ready to Get Started?
                        </h2>

                        <p className="mt-5 text-white/90 max-w-2xl mx-auto">
                            Bring your projects, CRM, support,
                            and workflows together in one
                            powerful platform.
                        </p>

                        <button className="mt-8 bg-white text-[#043264] px-8 py-4 rounded-xl font-semibold">
                            Start Free Trial
                        </button>

                    </div>
                </div>
            </section> */}
        </main>
    );
};

export default ProductPage;