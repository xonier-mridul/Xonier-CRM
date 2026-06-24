import { useEffect, useState } from "react";

const Counter = ({ end, start, duration = 2000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!start) return
        let star = 0;

        const increment = end / (duration / 16);

        const timer = setInterval(() => {
            star += increment;

            if (star >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(star));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [start]);

    return <span>{count}</span>;
};

export default Counter;