'use client';

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative flex flex-col items-center justify-center w-full min-h-screen overflow-hidden"
    >


      {/* Radial gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, var(--background) 80%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl">
        <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-tight">
          Master the{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(135deg, #ff6600 0%, #FF5F15 50%, #ff8c42 100%)',
            }}
          >
            Architecture
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-light-secondary/60 dark:text-dark-secondary/60 max-w-2xl leading-relaxed">
          Premium developer learning platform for{' '}
          <span className="text-orange-500 dark:text-orange-400 font-medium">HLD</span>,{' '}
          <span className="text-orange-500 dark:text-orange-400 font-medium">LLD</span> &{' '}
          <span className="text-orange-500 dark:text-orange-400 font-medium">DSA</span>{' '}
          — immersive, interactive, and beautifully visual.
        </p>

        <button
          className="mt-10 px-8 py-3.5 rounded-lg font-semibold text-white text-lg
                     transition-all duration-300 ease-out
                     hover:scale-105 hover:shadow-[0_0_30px_rgba(255,102,0,0.4)]
                     active:scale-95"
          style={{
            backgroundImage: 'linear-gradient(135deg, #ff6600, #FF5F15)',
          }}
        >
          Start Learning
        </button>

        {/* Scroll indicator */}
        <div className="mt-16 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs tracking-widest uppercase">Scroll to explore</span>
          <div className="w-5 h-8 rounded-full border-2 border-current flex items-start justify-center p-1">
            <div
              className="w-1 h-2 rounded-full bg-current"
              style={{ animation: 'fade-in-up 1.5s ease-in-out infinite' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
