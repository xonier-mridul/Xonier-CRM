
import Values from '../../components/pages/company/Values';
import Story from '../../components/pages/company/Story';
// import Team from '../../components/pages/company/Team';
import Stats from '../../components/pages/company/Stats';
import Hero from '../../components/pages/company/Hero';
import CompanyCta from '../../components/pages/company/companyCTA';







const CompanyPage = () => {
    // Mock data matching the styling structure of Trakeroo


    return (
        <div className="bg-white text-[#33415c] font-sans antialiased selection:bg-[#16c2cf]/20">

            {/* ===== HERO SECTION ===== */}
            <Hero />

            {/* ===== STATS BAND ===== */}
            <Stats />


            {/* ===== VALUES SECTION ===== */}
            <Values />

            {/* ===== TIMELINE STORY ===== */}
            <Story />


            {/* ===== TEAM SECTION ===== */}
            {/* <Team /> */}


            {/* ===== FINAL CTA BANNER ===== */}
            <CompanyCta />

        </div>
    );
}
export default CompanyPage;