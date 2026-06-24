import { useEffect, useState } from 'react'
import axios from 'axios'

const Countries = () => {

    const [countriesData, setCountriesData] = useState([])

    const getCountries = async () => {

        try {

            const res = await axios(
                'https://restcountries.com/v3.1/all?fields=name,idd,flags'
            )

            if (res.status === 200) {

                const formattedData = res.data.map((item) => ({
                    name: item.name.common,
                    code:
                        item.idd?.root
                            ? item.idd.root + (item.idd.suffixes?.[0] || '')
                            : '',
                    flag: item.flags?.png
                }))

                setCountriesData(formattedData)
            }

        } catch (err) {
            console.log('Error:', err)
        }
    }

    useEffect(() => {
        getCountries()
    }, [])

    return (
        <>

            <select className=' w-full py-3  border-r border-slate-200 text-slate-500 flex items-center justify-center outline-0 '>
                <option>+91</option>

                {countriesData.map((item, index) => (

                    <option
                        key={index}
                        value={item.code}

                    >
                        {item.code}</option>

                ))}

            </select>

        </>
    )
}

export default Countries