'use client';

import { useState, useEffect } from 'react';
import NavbarElements from './NavbarElements';

/** The fixed 60px site header; it gains a surface and hairline once the page scrolls. */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 top-0 z-50 h-[60px] w-full border-b transition-colors duration-small ${
        scrolled ? 'border-line-hairline bg-surface-page/85 backdrop-blur-xl' : 'border-transparent bg-transparent'
      }`}
    >
      <NavbarElements />
    </header>
  );
}
