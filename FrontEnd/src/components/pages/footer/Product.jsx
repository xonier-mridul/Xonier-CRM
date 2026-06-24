import React from 'react'
import { Link } from 'react-router-dom';
import { productPages } from '../../../data/footer';


const Product = () => {
    return (
        <div className="fcol">
            <h5>Product</h5>


            {
                productPages.map((i) => {
                    return (
                        <div key={i.id}>
                            <Link to={`/Product/${i.slug}`}
                                onClick={() => window.scrollTo(0, 0)}>
                                {i.title}
                            </Link>

                        </div>
                    )
                })
            }

        </div>

    )
}

export default Product