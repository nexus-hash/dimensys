import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'About', href: '/about' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'GitHub', href: 'https://github.com/nexus-hash/dimensys' },
] as const;

/** Site footer: one quiet row — the notice on the left, a few links on the right. */
export default function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-[1280px] flex-wrap justify-between gap-4 border-t border-line-hairline px-4 pb-10 pt-6 text-[13px] text-ink-muted sm:px-6 sm:pb-12 sm:pt-8">
      <span>© 2026 dimensys · non-commercial · the simulation is a model, not a benchmark</span>
      <nav aria-label="Footer" className="flex flex-wrap gap-4">
        {FOOTER_LINKS.map((item) => (
          <Link key={item.href} href={item.href} className="text-ink-secondary transition-colors duration-micro hover:text-ink-primary">
            {item.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
