import { Link } from 'react-router-dom'

const Company = () => {
    return (
        <div className="fcol">
            <h5>Company</h5>

            <Link to='/Company' onClick={() => window.scrollTo(0, 0)}>About Us</Link>

            <Link to='/Career'
                onClick={() => window.scrollTo(0, 0)}>Careers</Link>

            <Link to='/Blogs' onClick={() => window.scrollTo(0, 0)}>Blog</Link>

            <a href="#">Case Studies</a>

            <Link to='/Form' onClick={() => window.scrollTo(0, 0)}>Contact</Link>
        </div>

    )
}

export default Company