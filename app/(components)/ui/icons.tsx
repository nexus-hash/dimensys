import type { SVGProps } from 'react';

/**
 * A minimal inline icon set (1.5px stroke, 16/20px grid, §3.7) so the
 * primitive layer doesn't need an icon package dependency. Real product UI
 * (nav, node icons, …) uses Lucide per §3.7; these are placeholders for
 * dev-gallery and internal primitive chrome only (close buttons, carets, …).
 */
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
      {...props}
    />
  );
}

export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Base>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="m6 9 6 6 6-6" />
    </Base>
  );
}

export function ChevronUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="m18 15-6-6-6 6" />
    </Base>
  );
}

export function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M20 6 9 17l-5-5" />
    </Base>
  );
}

export function DragHandleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M4 12h16" />
    </Base>
  );
}

export function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </Base>
  );
}

export function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <Base {...props}>
      <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
    </Base>
  );
}
