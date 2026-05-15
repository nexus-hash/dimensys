'use client';

import { useState, useEffect } from "react";
import NavbarElements from "./NavbarElements";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once on mount
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-0 left-0 w-full h-14 lg:h-16 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[rgba(255,102,0,0.06)] backdrop-blur-xl border-b border-orange-500/15 shadow-[0_4px_30px_rgba(255,102,0,0.05)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="flex items-center justify-center h-full px-4 w-full">
        <div className="w-full xl:max-w-7xl h-full">
          <NavbarElements />
        </div>
      </div>
    </div>
  );
}