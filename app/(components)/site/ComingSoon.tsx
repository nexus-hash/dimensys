import type { ReactNode } from 'react';
import Navbar from '../navbar/Navbar';
import Footer from '../footer/Footer';
import CircuitBackground from '../problems/CircuitBackground';

export interface ComingSoonProps {
  eyebrow: string;
  title: string;
  body: ReactNode;
}

/**
 * Minimal chrome for a route the nav links to that isn't built yet
 * (Replays, Daily, Paths — HOME2). A real page with a title and an honest
 * "Coming soon" state, so the link isn't dead, rather than a stub that
 * fakes content.
 */
export function ComingSoon({ eyebrow, title, body }: ComingSoonProps) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-light-primary font-sans dark:bg-dark-primary">
      <CircuitBackground />
      <Navbar />
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 pt-28 pb-24 text-center">
        <div className="flex max-w-xl flex-col items-center gap-4">
          <span className="font-mono text-label uppercase tracking-wide text-brand-ink">{eyebrow}</span>
          <h1 className="text-title-1 text-ink-primary">{title}</h1>
          <p className="text-body-lg text-ink-secondary">{body}</p>
          <span
            className="mt-2 inline-flex items-center rounded-full border border-line-hairline px-3 py-1 font-mono text-label text-ink-muted"
            role="status"
          >
            Coming soon
          </span>
        </div>
      </main>
      <Footer />
    </div>
  );
}
