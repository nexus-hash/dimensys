import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SysViz — Systems Design, Visualized",
  description:
    "Learn HLD, LLD and DSA by scrolling through interactive 3D visualizations. Cache hits, geo-replication, stress testing — all in your browser.",
};

export default async function RootLayout({children}: { children: React.ReactNode }) {

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
