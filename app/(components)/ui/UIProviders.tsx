'use client';

import * as React from 'react';
import { TooltipProvider } from './Tooltip';
import { ToastProvider } from './Toast';

/**
 * Mounts the primitive layer's app-wide runtime providers (DS3): Radix
 * Tooltip's shared delay group, and the Toast queue + viewport so `toast()`
 * works from anywhere. Purely additive — renders no visible chrome of its
 * own beyond the (initially empty) toast viewport, so it doesn't restyle
 * any existing page.
 */
export function UIProviders({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={250}>
      <ToastProvider>{children}</ToastProvider>
    </TooltipProvider>
  );
}
