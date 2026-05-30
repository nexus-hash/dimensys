import Navbar from '../../(components)/navbar/Navbar';
import Footer from '../../(components)/footer/Footer';
import CircuitBackground from '../../(components)/problems/CircuitBackground';

// Need to await params in Next.js 15
export default async function AiConceptPlaceholderPage({ params }: { params: Promise<{ concept: string }> }) {
  const resolvedParams = await params;
  const title = resolvedParams.concept.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <div className="flex min-h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans relative overflow-x-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50 z-0"></div>
      <CircuitBackground />
      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center justify-center pt-24 pb-20 px-4 z-10 relative text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-light-secondary dark:text-dark-secondary mb-6">
          {title}
        </h1>
        <div className="inline-block p-[2px] rounded-full bg-gradient-to-r from-orange-500 to-amber-500 mb-6 shadow-[0_0_20px_rgba(255,102,0,0.3)]">
          <div className="px-6 py-2 rounded-full bg-light-primary dark:bg-dark-primary">
            <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-amber-500">
              Interactive 3D Render Coming Soon
            </span>
          </div>
        </div>
        <p className="text-lg text-gray-500 max-w-2xl">
          We are currently building an innovative interactive visualization for this concept using our dms-engine. Check back soon for an immersive learning experience!
        </p>
      </main>

      <Footer />
    </div>
  );
}
