'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/app/(components)/ui';

interface NavButtonsProps {
  isMobile?: boolean;
  onClick?: () => void;
}

/**
 * Global nav items: Explore, Replays, Daily, Paths, Concepts. "Daily"
 * carries a dot badge while today's puzzle is unsolved — there's no
 * accounts/progress system yet, so it's shown on (nothing to mark solved
 * against) rather than faked as solved.
 */
interface NavLink {
  name: string;
  path: string;
  dot?: boolean;
}

const NAV_LINKS: readonly NavLink[] = [
  { name: 'Explore', path: '/explore' },
  { name: 'Replays', path: '/replays' },
  { name: 'Daily', path: '/daily', dot: true },
  { name: 'Paths', path: '/paths' },
  { name: 'Concepts', path: '/concepts' },
];

export default function NavButtons({ isMobile = false, onClick }: NavButtonsProps) {
  const pathname = usePathname();

  return (
    <>
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.path || pathname?.startsWith(`${link.path}/`);
        return (
          <Link
            key={link.name}
            href={link.path}
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative rounded-md font-medium transition-colors duration-micro hover:bg-surface-glass hover:text-ink-primary',
              isMobile ? 'w-full px-3 py-3 text-base' : 'px-2.5 py-1.5 text-sm',
              isActive ? 'text-ink-primary' : 'text-ink-secondary',
              // Active underline, inset to the link's own horizontal padding.
              isActive &&
                !isMobile &&
                'after:absolute after:inset-x-2.5 after:-bottom-0.5 after:h-0.5 after:rounded-sm after:bg-brand',
            )}
          >
            {link.name}
            {link.dot ? (
              <>
                <span
                  aria-hidden
                  className={cn(
                    'inline-block h-1.5 w-1.5 rounded-full bg-brand',
                    isMobile ? 'ml-1.5 align-middle' : 'absolute right-[3px] top-1.5',
                  )}
                />
                <span className="sr-only"> (today&apos;s puzzle unsolved)</span>
              </>
            ) : null}
          </Link>
        );
      })}
    </>
  );
}
