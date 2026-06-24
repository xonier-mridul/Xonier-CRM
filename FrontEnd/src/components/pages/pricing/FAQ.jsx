import React from 'react'

const data = [
    {
        "question": "Can I change my plan later?",
        "answer": "Yes, you can upgrade or downgrade your plan at any time."
    },
    {
        "question": "Can I cancel anytime?",
        "answer": "Absolutely. There are no long-term contracts."
    },
    {
        "question": "Is there a free trial?",
        "answer": "Yes, all paid plans include a free trial period."
    },
    {
        "question": "Is my data secure?",
        "answer": "Your data is protected with enterprise-grade security."
    },
    {
        "question": "What payment methods do you accept?",
        "answer": "We accept all major credit cards and bank transfers."
    },
    {
        "question": "Do you offer refunds?",
        "answer": "Refund requests are reviewed according to our refund policy."
    }
]



const FAQ = () => {
    return (
        <div className='w-full h-full pt-24'>
            <div className='max-w-7xl h-full mx-auto flex flex-col  items-center px-4'>
                <div className='flex flex-col items-center text-center'>
                    <span className=" flex  items-center justify-center gap-2 px-4 py-1.5 bg-white border border-[#e3ebf2] rounded-full text-[13.5px] font-semibold text-[#0fb8c4] shadow-sm mb-6 w-fit">
                        <span className="w-2 h-2 rounded-full bg-[#16c2cf] animate-pulse "></span>
                        FAQ
                    </span>
                    <h1>Frequently Asked{' '}
                        <span className="bg-gradient-to-r from-[#16c2cf] to-[#0fb8a5] bg-clip-text text-transparent">Questions</span></h1>
                </div>
                <div className=' grid grid-cols-2 gap-10 mt-10 w-full mx-5 '>
                    {
                        data.map((i, ind) => {
                            return (
                                <details key={ind} className='faq'>
                                    <summary > {i.question}
                                        <span className="ico transition-all duration-300 " >
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
                                        </span></summary>
                                    <div className='ans'>{i.answer}</div>
                                </details>

                            )
                        })
                    }
                </div>


            </div>
        </div>
    )
}

export default FAQ