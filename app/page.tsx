import Navbar from "./(components)/navbar/Navbar";
import Dashboard from "./(components)/dashboard/Dashboard";
import HeroSection from "./(components)/dashboard/HeroSection";
import Footer from "./(components)/footer/Footer";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-light-primary dark:bg-dark-primary font-sans relative"> 
      <Navbar />
      <main className="w-full flex flex-col items-center">
        <HeroSection />
        <div className="flex flex-col flex-1 items-center justify-center 2xl:max-w-7xl xl:max-w-6xl w-full">
          <Dashboard />
        </div>
      </main>
      <Footer />
    </div>
  );
}
