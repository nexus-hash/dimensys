import type { ReactElement, SVGProps } from 'react';
import { PowerIcon, TrendingUpIcon } from '@/app/(components)/ui';
import type { BreakTool } from './tools';

/** Break It's own glyphs, on the same 24px grid and 1.5px stroke as the UI kit's icons. */
function Base(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    />
  );
}

export function ScissorsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1L12 12" />
    </Base>
  );
}

export function HourglassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M6 2.5h12M6 21.5h12M7 2.5V6a5 5 0 0 0 10 0V2.5M7 21.5V18a5 5 0 0 1 10 0v3.5" />
    </Base>
  );
}

export function SnowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9 3.5l3 2 3-2M9 20.5l3-2 3 2" />
    </Base>
  );
}

export function WrenchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z" />
    </Base>
  );
}

export function ShieldIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </Base>
  );
}

export function BarsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M5 20V11M11 20V5M17 20v-6M3 20h18" />
    </Base>
  );
}

export function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </Base>
  );
}

export function DatabaseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </Base>
  );
}

/** A cache (a stack of memory) with a crack through it: the cache failures. */
export function CacheIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <rect x="3.5" y="4" width="17" height="6" rx="1.5" />
      <rect x="3.5" y="14" width="17" height="6" rx="1.5" />
      <path d="M7 7h.01M7 17h.01M13.5 4l-1.5 3 2 2-1.5 3.5M12.5 14l1.5 3-1.5 3" />
    </Base>
  );
}

export function UndoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </Base>
  );
}

const TOOL_ICONS: Record<BreakTool, (p: SVGProps<SVGSVGElement>) => ReactElement> = {
  kill: PowerIcon,
  spike: TrendingUpIcon,
  partition: ScissorsIcon,
  slow: HourglassIcon,
  flush: SnowIcon,
};

export function ToolIcon({ tool, ...props }: { tool: BreakTool } & SVGProps<SVGSVGElement>) {
  const Icon = TOOL_ICONS[tool];
  return <Icon aria-hidden focusable={false} {...props} />;
}

/** A fix's category glyph: resilience, scale, caching, data (traffic and anything else share the trend line). */
export function FixNatureIcon({ nature, ...props }: { nature?: string } & SVGProps<SVGSVGElement>) {
  switch (nature) {
    case 'resilience':
      return <ShieldIcon {...props} />;
    case 'scale':
      return <BarsIcon {...props} />;
    case 'caching':
      return <LayersIcon {...props} />;
    case 'data':
      return <DatabaseIcon {...props} />;
    default:
      return <TrendingUpIcon aria-hidden focusable={false} {...props} />;
  }
}
