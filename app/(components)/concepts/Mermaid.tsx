'use client';
import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';

export default function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgId] = useState(() => `mermaid-${Math.random().toString(36).substring(7)}`);
  const { theme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: theme === 'dark' ? '#171717' : '#f3f4f6',
        primaryTextColor: theme === 'dark' ? '#f9fafb' : '#111827',
        primaryBorderColor: theme === 'dark' ? '#f97316' : '#ea580c', // Orange accents
        lineColor: theme === 'dark' ? '#fb923c' : '#f97316',
        secondaryColor: theme === 'dark' ? '#262626' : '#e5e7eb',
        tertiaryColor: theme === 'dark' ? '#0a0a0a' : '#ffffff',
        nodeTextColor: theme === 'dark' ? '#f9fafb' : '#111827',
        mainBkg: theme === 'dark' ? '#171717' : '#f3f4f6',
        clusterBkg: theme === 'dark' ? 'transparent' : '#ffffff',
        clusterBorder: theme === 'dark' ? '#333333' : '#d1d5db',
        edgeLabelBackground: theme === 'dark' ? '#171717' : '#ffffff',
        actorBkg: theme === 'dark' ? '#171717' : '#f3f4f6',
        actorBorder: theme === 'dark' ? '#f97316' : '#ea580c',
        actorTextColor: theme === 'dark' ? '#f9fafb' : '#111827',
        signalColor: theme === 'dark' ? '#fb923c' : '#f97316',
        signalTextColor: theme === 'dark' ? '#d1d5db' : '#4b5563',
        noteBkgColor: theme === 'dark' ? '#262626' : '#e5e7eb',
        noteTextColor: theme === 'dark' ? '#f9fafb' : '#111827',
        noteBorderColor: theme === 'dark' ? '#f97316' : '#ea580c',
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
