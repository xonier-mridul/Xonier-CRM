
import { Link } from 'react-router-dom'
import { careersPageData } from '../../../data/careers'
import CTA from '../../common/CTA'

const Last = () => {
    const data = careersPageData.cta
    return (<>

        <>
            <CTA title={data.title} desc={data.desc} btn={data.button} />
        </>
    </>

    )
}

export default Last