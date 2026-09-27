'use client';

import { useState } from 'react';
import Link from 'next/link';
import ThemeButton from '../theme/ThemeButton';
import Avatar from './Avatar';
import SearchBar from './SearchBar';
import NavButtons from './NavButtons';
import Streak from './Streak';
import { BrandMark } from '../brand/BrandMark';

export default function NavbarElements() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between h-full w-full">
        {/* Left: Brand / Logo — mark + lowercase wordmark, per the approved design */}
        <div className="flex items-center justify-start flex-1 md:flex-none">
          <Link href="/" className="flex items-center gap-2 group" aria-label="dimensys home">
            <BrandMark size={24} />
            <span className="text-title-3 font-semibold tracking-tight text-ink-primary" aria-hidden="true">
              dimensys
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <div className="hidden md:flex items-center justify-center flex-1 gap-6 lg:gap-8">
          <NavButtons />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end flex-1 md:flex-none gap-2 lg:gap-3">
          <SearchBar />
          <Streak />
          <ThemeButton />
          <Avatar />

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 text-light-secondary dark:text-dark-secondary"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div
          className="absolute top-full left-0 w-full bg-[rgba(255,255,255,0.95)] dark:bg-[rgba(18,18,18,0.95)] backdrop-blur-md border-b border-orange-500/15 p-4 md:hidden flex flex-col gap-4 shadow-lg z-40"
          style={{ animation: 'slideDown 0.2s ease-out' }}
        >
          <NavButtons isMobile={true} onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
}