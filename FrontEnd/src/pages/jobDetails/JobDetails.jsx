import { jobDetails } from "../../data/careers";

import Hero from "../../components/pages/jobDetails/hero";
import { useParams } from "react-router-dom";
import Side from "../../components/pages/jobDetails/Side";



const JobDetails = () => {
    const { slug } = useParams()

    const data = jobDetails.find((i) => i.slug === slug)
    const side = data.sidebar


    return (
        <div className="w-full min-h-[90vh] py-20 bg-slate-50">
            <div className="max-w-7xl mx-auto h-full grid grid-cols-3 gap-10">
                <Hero data={data} />


                {/* right */}
                <div className="w-full col-span-1 bg-white p-4 border border-slate-200 rounded-2xl ">
                    <Side side={side} />

                </div>

            </div>


        </div>
    )
}

export default JobDetails