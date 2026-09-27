import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/(components)/theme/ThemeProvider";
import { UIProviders } from "@/app/(components)/ui/UIProviders";
import { CommandProvider, type PaletteNavItem } from "@/app/(components)/command";
import { loadCatalog } from "@/app/(server)/engine/publicData";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "dimensys";
const description =
  "Step inside real systems. Real architectures, running live in your browser.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
  },
};

const STATIC_NAV_ITEMS: PaletteNavItem[] = [
  { id: "page:home", title: "Home", kind: "page", href: "/" },
  { id: "page:explore", title: "Explore", kind: "page", href: "/explore" },
  { id: "page:replays", title: "Replays", kind: "page", href: "/replays" },
  { id: "page:daily", title: "Daily", kind: "page", href: "/daily" },
  { id: "page:paths", title: "Paths", kind: "page", href: "/paths" },
  { id: "page:concepts", title: "Concepts", kind: "page", href: "/concepts" },
  { id: "page:ai", title: "Artificial Intelligence", kind: "page", href: "/artificial-intelligence" },
  { id: "page:about", title: "About", kind: "page", href: "/about" },
];

/**
 * Small, serialisable rows for the command palette's navigation results —
 * computed server-side (this is a Server Component) and handed down as
 * plain data to the client palette, never a server-only module reference.
 */
async function getNavItems(): Promise<PaletteNavItem[]> {
  try {
    const catalog = await loadCatalog();
    const diagrams: PaletteNavItem[] = catalog.cards.map((card) => ({
      id: card.id,
      title: card.title,
      kind: card.family,
      href: card.href,
      tags: card.labels,
    }));
    return [...diagrams, ...STATIC_NAV_ITEMS];
  } catch {
    // No synced catalog in this environment (e.g. a frontend-only dev
    // server run before the engine step has ever synced). The palette
    // still works, just without diagram results.
    return STATIC_NAV_ITEMS;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const navItems = await getNavItems();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange nonce="">
          <UIProviders>
            <CommandProvider navItems={navItems}>{children}</CommandProvider>
          </UIProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
