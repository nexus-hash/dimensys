import Link from 'next/link';
import type { ReactNode } from 'react';
import { Pill } from '@/app/(components)/ui';
import { Reveal } from './Reveal';

interface ShowcaseLink {
  href: string;
  label: string;
}

export interface ShowcaseSectionProps {
  /** Two-digit showcase number, e.g. "01" (prototype `.show-n`). */
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
  /** Alternates text/visual sides on wide viewports (prototype `.show.flip`). */
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
    <section aria-labelledby={headingId} className="w-full py-20 sm:py-28">
      <Reveal
        className={`mx-auto flex w-full max-w-6xl flex-col items-center gap-10 px-4 sm:px-6 md:gap-16 ${
          flip ? 'md:flex-row-reverse' : 'md:flex-row'
        }`}
      >
        <div className="flex w-full flex-col gap-4 md:max-w-md">
          <div className="flex items-center gap-2 font-mono text-label text-ink-muted">
            <span aria-hidden className="text-brand-ink">
              {index}
            </span>
            {eyebrow}
          </div>
          <h2 id={headingId} className="text-title-1 text-ink-primary">
            {heading}
          </h2>
          <p className="text-body-lg text-ink-secondary">{body}</p>
          {link ? (
            <Link
              href={link.href}
              className="inline-flex w-fit items-center gap-1.5 text-body font-medium text-brand-ink transition-colors hover:text-ink-primary"
            >
              {link.label}
              <ArrowRightIcon />
            </Link>
          ) : comingSoon ? (
            <Pill variant="neutral">Coming soon</Pill>
          ) : null}
        </div>
        <div className="w-full md:flex-1">{visual}</div>
      </Reveal>
    </section>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-4 w-4 flex-none"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
