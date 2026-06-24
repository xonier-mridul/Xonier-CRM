import Hero from "../../components/pages/home/Hero";
import Strip from "../../components/pages/home/Strip";
import Pillars from "../../components/pages/home/Pillars";
import Performance from "../../components/pages/home/Performance";
import Features from "../../components/pages/home/Features";
import Stats from "../../components/pages/home/Stats";
import Testimonials from "../../components/pages/home/Testimonials";
import Pricing from "../../components/pages/home/Pricing";
// import Team from "../../components/pages/home/Team";
import FAQ from "../../components/pages/home/FAQs";
import FinalCTA from "../../components/pages/home/CTA";

const Home = () => {
    return (
        <>
            <Hero />
            <Strip />
            <Pillars />
            <Performance />
            <Features />
            <Stats />
            <Testimonials />
            <Pricing />
            {/* <Team /> */}
            <FAQ />
            <FinalCTA />
        </>
    );
};

export default Home;