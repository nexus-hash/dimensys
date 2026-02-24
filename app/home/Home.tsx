import CTA from "@/components/Home/CTA";
import Features from "@/components/Home/Features";
import Footer from "@/components/Home/Footer";
import Hero from "@/components/Home/Hero";
import HowItWorks from "@/components/Home/HowItWorks";
import Marquee from "@/components/Home/Marquee";
import Nav from "@/components/Home/Nav";
import Problems from "@/components/Home/Problems";

export default function Home () {
    return (
        <div className="w-screen">
            <div className="">
                <Nav />
                <main>
                    <Hero />
                    <Marquee />
                    <HowItWorks />
                    <Problems />
                    <Features />
                    <CTA />
                </main>
                <Footer />
            </div>
        </div>
    );
}