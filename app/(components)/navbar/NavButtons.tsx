'use client';

import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';

interface NavButtonsProps {
  isMobile?: boolean;
  onClick?: () => void;
}

export default function NavButtons({ isMobile = false, onClick }: NavButtonsProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigation = (path: string) => {
    router.push(path);
    if (onClick) onClick();
  };

  const navLinks = [
    { name: 'Concepts', path: '/concepts' },
    { name: 'Problems', path: '/problems' },
    { name: 'AI', path: '/artificial-intelligence' },
    { name: 'About', path: '/about' },
  ];

  return (
    <>
      {navLinks.map((link) => {
        const isActive = pathname === link.path;
        return (
          <button
            key={link.name}
            onClick={() => handleNavigation(link.path)}
            className={`
              nav-link-underline text-sm font-medium transition-colors duration-200
              ${isMobile ? 'py-3 text-left w-full text-base' : 'py-1 px-2'}
              ${
                isActive
                  ? 'text-orange-500 dark:text-orange-400 active'
                  : 'text-light-secondary/70 hover:text-light-secondary dark:text-dark-secondary/70 dark:hover:text-dark-secondary'
              }
            `}
          >
            {link.name}
          </button>
        );
      })}
    </>
  );
}