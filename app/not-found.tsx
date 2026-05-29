import Link from 'next/link';
import Navbar from './(components)/navbar/Navbar';
import CircuitBackground from './(components)/problems/CircuitBackground';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans relative overflow-hidden">
      <CircuitBackground />
      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center justify-center mt-16 px-4 z-10 relative">
        <div className="text-center max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in duration-700">
          
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full" />
            <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-400 drop-shadow-sm tracking-tighter relative z-10">
              404
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              Page Not Found
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              The connection to this sector has been lost. The page you are looking for might have been moved, deleted, or never existed in this dimension.
            </p>
          </div>

          <div className="pt-8">
            <Link 
              href="/" 
              className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold text-white bg-orange-500 rounded-full hover:bg-orange-600 transition-all duration-300 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transform hover:-translate-y-1"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return Home
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
