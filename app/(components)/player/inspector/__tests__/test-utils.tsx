import React from 'react';
import { render as originalRender, type RenderOptions } from '@testing-library/react';
import { TooltipProvider } from '@/app/(components)/ui/Tooltip';

/** `CodeBlock`/`AnnotatedCode`'s copy button reads `TooltipProvider` context (same reason `content/__tests__/test-utils.tsx` wraps it) — the inspector's `source`/`notedSource` sections need the same ancestor. */
export function render(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => <TooltipProvider>{children}</TooltipProvider>;
  return originalRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
