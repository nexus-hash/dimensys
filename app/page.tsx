import { StrictMode } from "react";
import ThemeProvider from "./contexts/ThemeProvider";
import Home from "./home/Home";



export default function Page() {
  return (
    <StrictMode>
      <ThemeProvider>
        <Home />
      </ThemeProvider>
    </StrictMode>
  );
}

// https://youtube.com/shorts/jAZSJXeopdQ?si=a4NLMrRTTIkKbR1n