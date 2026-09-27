import Link from 'next/link';
import { Button } from '@/app/(components)/ui';
import { HERO_DIAGRAM_ID } from './Hero';

/** Home's closing CTA (S4.6a). */
export function ClosingCta() {
  return (
    <section aria-labelledby="home-closing-heading" className="w-full py-20 sm:py-28">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h2 id="home-closing-heading" className="text-title-1 text-ink-primary">
          Pick a system.{' '}
          <span className="bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">Break it.</span>
        </h2>
        <p className="text-body-lg text-ink-secondary">
          Start with a healthy URL shortener. It takes about a minute to bring it down, and a little longer to learn
          why.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href={`/solutions/${HERO_DIAGRAM_ID}`}>Start breaking things</Link>
          </Button>
          <Button asChild variant="glass" size="lg">
            <Link href="/explore">Explore all systems</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
