"use client";

import { ThemeContext } from "@/app/contexts/ThemeProvider";
import { useContext, useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { theme, setTheme } = useContext(ThemeContext);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <div
      className={[
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-5",
        " transition-all duration-300 w-full",
        scrolled
          ? " bg-bg dark:bg-bg2 backdrop-blur-md"
          : "",
      ].join(" ")}
    >
      {/* Logo */}
      <a
        href="#"
        className="text-[13px] font-bold tracking-[0.08em] uppercase text-ink no-underline"
      >
        DimenSys
      </a>

      {/* Links */}
      <ul className="flex gap-8 list-none items-center">
        {["How it works", "Problems", "Roadmap", "Docs"].map((item) => (
          <li key={item}>
            <a
              href={item === "How it works" ? "#how" : item === "Problems" ? "#problems" : "#"}
              className="text-[11px] font-semibold tracking-widest uppercase text-ink3 no-underline hover:text-ink transition-colors duration-200"
            >
              {item}
            </a>
          </li>
        ))}
      </ul>

      {/* Right actions */}
      <div className="flex gap-4 items-center">
        <button
          onClick={toggleTheme}
          title="Toggle theme"
          className="w-9 h-9 border border-(--border) bg-transparent cursor-pointer rounded text-ink3 text-sm flex items-center justify-center hover:text-ink hover:border-ink transition-all duration-200 font-mono"
        >
          {theme === "dark" ? "○" : "◐"}
        </button>
        <button className="font-mono text-[11px] font-bold tracking-widest uppercase px-5 py-2.5 bg-ink text-bg border-none cursor-pointer rounded-sm hover:opacity-80 transition-opacity duration-200">
          Early Access
        </button>
      </div>
    </div>
  );
}
