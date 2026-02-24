'use client'
import { createContext, useState } from "react";

export const ThemeContext = createContext({theme: "dark", setTheme: (theme: string) => {}});

export default function ThemeProvider({ children }: { children: React.ReactNode }) {

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}