import Link from 'next/link';
import { ArrowRightIcon, Button } from '@/app/(components)/ui';
import { HERO_DIAGRAM_ID } from './Hero';

/** Home's closing CTA (S4.6a): centred, over a dot grid that fades out from the middle. */
export function ClosingCta() {
  return (
    <section
      aria-labelledby="home-closing-heading"
      className="closing-dots relative isolate mx-auto flex w-full max-w-[1200px] flex-col items-center gap-[18px] px-4 pb-24 pt-[72px] text-center sm:px-6 sm:pb-[136px] sm:pt-[120px]"
    >
      <h2
        id="home-closing-heading"
        className="text-[38px] font-bold leading-[1.05] tracking-[-0.03em] text-balance text-ink-primary sm:text-[clamp(36px,4.4vw,60px)]"
      >
        Pick a system. <span className="bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">Break it.</span>
      </h2>
      <p className="max-w-[32em] text-[17px] text-ink-secondary">
        Start with a healthy URL shortener. It takes about a minute to bring it down, and a little longer to learn why.
      </p>
      <div className="mt-2.5 flex w-full flex-wrap justify-center gap-3 max-sm:[&>*]:flex-auto">
        <Button asChild variant="primary" size="lg">
          <Link href={`/solutions/${HERO_DIAGRAM_ID}`}>
            Start breaking things
            <ArrowRightIcon />
          </Link>
        </Button>
        <Button asChild variant="glass" size="lg">
          <Link href="/explore">Explore all systems</Link>
        </Button>
      </div>
    </section>
  );
}
