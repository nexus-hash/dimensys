'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

interface NavButtonsProps {
  isMobile?: boolean;
  onClick?: () => void;
}

/**
 * Global nav items (the approved design): Explore, Replays, Daily, Paths,
 * Concepts. "Daily" carries a dot badge while today's puzzle is unsolved —
 * there's no accounts/progress system yet, so it's shown inert-on (nothing
 * to mark solved against) rather than faked as solved.
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
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    if (onClick) onClick();
  };

  return (
    <>
      {NAV_LINKS.map((link) => {
        const isActive = pathname === link.path;
        return (
          <button
            key={link.name}
            onClick={() => handleNavigation(link.path)}
            className={`
              nav-link-underline relative inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-200
              ${isMobile ? 'py-3 text-left w-full text-base' : 'py-1 px-2'}
              ${
                isActive
                  ? 'text-orange-500 dark:text-orange-400 active'
                  : 'text-light-secondary/70 hover:text-light-secondary dark:text-dark-secondary/70 dark:hover:text-dark-secondary'
              }
            `}
          >
            {link.name}
            {link.dot ? (
              <span
                aria-label="today's puzzle unsolved"
                className="inline-block h-1.5 w-1.5 flex-none rounded-full bg-brand"
              />
            ) : null}
          </button>
        );
      })}
    </>
  );
}
