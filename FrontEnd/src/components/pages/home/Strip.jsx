import React, { useEffect } from 'react'
import gsap from 'gsap'


const Strip = () => {
    useEffect(() => {
        gsap.from('.wra', {
            x: 30,
            opacity: 0,
            duration: 1,
            scrollTrigger: '.wra',
            // scrub: 0.2,

        })
        gsap.from('.wraRow', {
            x: 30,
            opacity: 0,
            duration: 2,
            // scrub: 0.2,

            scrollTrigger: {
                trigger: '.wraRow',
                start: 'top 70%'

            }

        })

    }, [])
    return (
        <>
            <div className="logos">
                <div className="wrap ">
                    <p className='wra'>Powering productive teams at</p>
                    <div className="logo-row  wraRow">
                        <span>Nimbus</span><span>Acme&nbsp;Co</span><span>Vertex</span><span>Lumio</span><span>Northpeak</span><span>Quanta</span>
                    </div>
                </div>
            </div>
        </>
    )
}

export default Strip