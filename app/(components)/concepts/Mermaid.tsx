'use client';
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

export default function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgId] = useState(() => `mermaid-${Math.random().toString(36).substring(7)}`);
  const { theme } = useTheme();

  useEffect(() => {
    // Mermaid's theme engine needs resolved color strings (it derives shades
    // from them internally), so the palette is read from the CSS tokens in
    // globals.css rather than hardcoded here. Those tokens are already
    // theme-aware via [data-theme], so no ternary is needed here — `theme`
    // stays a dependency purely to re-run this after a theme switch.
    const style = getComputedStyle(document.documentElement);
    const cssVar = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;

    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: cssVar('--mermaid-primary', 'transparent'),
        primaryTextColor: cssVar('--mermaid-primary-text', 'inherit'),
        primaryBorderColor: cssVar('--mermaid-border', 'currentColor'), // Orange accents
        lineColor: cssVar('--mermaid-line', 'currentColor'),
        secondaryColor: cssVar('--mermaid-secondary', 'transparent'),
        tertiaryColor: cssVar('--mermaid-tertiary', 'transparent'),
        nodeTextColor: cssVar('--mermaid-node-text', 'inherit'),
        mainBkg: cssVar('--mermaid-primary', 'transparent'),
        clusterBkg: cssVar('--mermaid-cluster-bg', 'transparent'),
        clusterBorder: cssVar('--mermaid-cluster-border', 'currentColor'),
        edgeLabelBackground: cssVar('--mermaid-edge-label-bg', 'transparent'),
        actorBkg: cssVar('--mermaid-actor-bg', 'transparent'),
        actorBorder: cssVar('--mermaid-border', 'currentColor'),
        actorTextColor: cssVar('--mermaid-primary-text', 'inherit'),
        signalColor: cssVar('--mermaid-line', 'currentColor'),
        signalTextColor: cssVar('--mermaid-signal-text', 'inherit'),
        noteBkgColor: cssVar('--mermaid-note-bg', 'transparent'),
        noteTextColor: cssVar('--mermaid-primary-text', 'inherit'),
        noteBorderColor: cssVar('--mermaid-border', 'currentColor'),
      },
      securityLevel: 'loose',
    });
    
    let isMounted = true;

    const renderChart = async () => {
      if (containerRef.current) {
        try {
          const { svg } = await mermaid.render(svgId, chart);
          if (isMounted && containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        } catch (error) {
          console.error("Mermaid parsing failed", error);
          if (isMounted && containerRef.current) {
             containerRef.current.innerHTML = `<div class="text-red-500 p-4 border border-red-500 rounded bg-red-50/10">Failed to render diagram</div>`;
          }
        }
      }
    };
    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart, svgId, theme]);

  return (
    <div className="mermaid-container my-8 flex justify-center bg-transparent py-8 rounded-xl border border-gray-200 dark:border-white/10">
      <div ref={containerRef} className="w-full flex justify-center max-w-full overflow-x-auto" />
    </div>
  );
}
