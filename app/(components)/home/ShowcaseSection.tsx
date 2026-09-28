import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRightIcon, Pill } from '@/app/(components)/ui';
import { Reveal } from './Reveal';

interface ShowcaseLink {
  href: string;
  label: string;
}

export interface ShowcaseSectionProps {
  /** Two-digit showcase number, e.g. "01". */
  index: string;
  eyebrow: string;
  headingId: string;
  heading: ReactNode;
  body: string;
  /** A real destination this capability already has. Omit when there is none yet. */
  link?: ShowcaseLink;
  /** Shown instead of `link` when the capability isn't built yet — never a fake link. */
  comingSoon?: boolean;
  visual: ReactNode;
  /** Alternates text/visual sides on wide viewports. */
  flip?: boolean;
}

/**
 * One showcase section: one capability, one visual, at most one link — the
 * Home page's below-the-fold rule (S4.6a). Never a grid or a list of cards.
 */
export function ShowcaseSection({
  index,
  eyebrow,
  headingId,
  heading,
  body,
  link,
  comingSoon,
  visual,
  flip = false,
}: ShowcaseSectionProps) {
  return (
    <section aria-labelledby={headingId} className="w-full">
      <Reveal className="mx-auto grid w-full max-w-[720px] items-center gap-7 px-4 py-[72px] sm:gap-10 sm:px-6 sm:py-24 lg:max-w-[1200px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-[72px] lg:py-[120px]">
        <div className={`max-w-[420px] ${flip ? 'lg:order-2' : ''}`}>
          <div className="flex items-center gap-2.5 font-mono text-[12px] font-medium uppercase leading-[1.4] tracking-[.06em] text-ink-muted">
            <span aria-hidden className="font-semibold text-brand-ink">
              {index}
            </span>
            {eyebrow}
          </div>
          <h2
            id={headingId}
            className="mt-3.5 text-[28px] font-[650] leading-[1.12] tracking-[-0.022em] text-balance text-ink-primary sm:text-[clamp(28px,3.1vw,40px)]"
          >
            {heading}
          </h2>
          <p className="mt-[18px] text-[16px] leading-[1.65] text-ink-secondary sm:text-[17px]">{body}</p>
          {link ? (
            <Link
              href={link.href}
              className="mt-[26px] inline-flex items-center gap-1.5 text-[15px] font-medium text-brand-ink hover:underline hover:underline-offset-[3px]"
            >
              {link.label}
              <ArrowRightIcon className="h-4 w-4 flex-none" />
            </Link>
          ) : comingSoon ? (
            <div className="mt-[26px]">
              <Pill variant="neutral">Coming soon</Pill>
            </div>
          ) : null}
        </div>
        <div className="m-0 min-w-0">{visual}</div>
      </Reveal>
    </section>
  );
}
