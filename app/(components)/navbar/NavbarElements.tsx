'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeButton from '../theme/ThemeButton';
import Avatar from './Avatar';
import SearchBar from './SearchBar';
import NavButtons from './NavButtons';
import Streak from './Streak';
import { BrandMark } from '../brand/BrandMark';
import { useCommandPalette } from '@/app/(components)/command';
import { CloseIcon, MenuIcon, SearchIcon } from '@/app/(components)/ui';

/**
 * Site header row: wordmark, then the primary links straight after it
 * (left-aligned, not centred), then the right-hand cluster — search pill,
 * streak, theme toggle, menu (below the desktop breakpoint, where the links
 * collapse into it) and the avatar.
 */
export default function NavbarElements() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openPalette } = useCommandPalette();

  return (
    <>
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link
          href="/"
          className="flex flex-none items-center gap-2 text-[17px] font-bold tracking-[-0.01em] text-ink-primary"
          aria-label="dimensys home"
          data-nav-brand
        >
          <BrandMark size={22} />
          <span aria-hidden="true">dimensys</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex" data-nav-links>
          <NavButtons />
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <SearchBar />
          <Streak />
          <ThemeButton />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-grid h-8 w-8 flex-none place-items-center rounded-control text-ink-secondary transition-colors duration-micro hover:bg-surface-glass hover:text-ink-primary lg:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="site-menu"
          >
            {mobileMenuOpen ? <CloseIcon className="h-[18px] w-[18px]" /> : <MenuIcon className="h-[18px] w-[18px]" />}
          </button>
          <Avatar />
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          id="site-menu"
          aria-label="Site menu"
          className="absolute left-0 top-full z-40 flex w-full flex-col gap-1 border-b border-line-hairline bg-surface-page p-4 shadow-elevation-2 lg:hidden"
        >
          <NavButtons isMobile onClick={() => setMobileMenuOpen(false)} />
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openPalette();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-base font-medium text-ink-secondary transition-colors duration-micro hover:bg-surface-glass hover:text-ink-primary sm:hidden"
          >
            <SearchIcon className="h-4 w-4 flex-none" />
            Search diagrams
          </button>
        </nav>
      )}
    </>
  );
}
