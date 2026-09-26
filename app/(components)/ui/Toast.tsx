'use client';

import * as React from 'react';
import { Toast as RadixToast } from 'radix-ui';
import { cn } from './utils';
import { dismissToast, getToastSnapshot, subscribeToasts, toast, type ToastVariant } from './toastStore';

export { toast };

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  neutral: '',
  ok: 'text-signal-ok',
  critical: 'text-signal-critical',
};

/**
 * Mount once near the app root. Renders the queue kept in `toastStore`, so
 * `toast()` can be called from anywhere (event handlers, non-React code)
 * without threading a hook through the call site.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const items = React.useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);

  return (
    <RadixToast.Provider swipeDirection="right" duration={4000}>
      {children}
      {items.map((item) => (
        <RadixToast.Root
          key={item.id}
          duration={item.duration || Infinity}
          onOpenChange={(open) => {
            if (!open) dismissToast(item.id);
          }}
          className={cn(
            'flex items-center gap-2.5 rounded-[10px] bg-ink-primary px-3.5 py-2.5 text-surface-page shadow-elevation-2',
            'font-medium text-[13px]',
            'data-[state=open]:animate-[rise_280ms_var(--ease-emphasized)]',
            'data-[state=closed]:animate-[fadeout_200ms_var(--ease-exit)]',
            'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
            'data-[swipe=end]:animate-[fadeout_200ms_var(--ease-exit)]',
          )}
        >
          <RadixToast.Title className={cn('flex-1', VARIANT_CLASSES[item.variant])}>
            {item.title}
          </RadixToast.Title>
          {item.description ? (
            <RadixToast.Description className="text-ink-secondary text-[12px]">
              {item.description}
            </RadixToast.Description>
          ) : null}
        </RadixToast.Root>
      ))}
      <RadixToast.Viewport
        className={cn(
          'fixed bottom-5 left-1/2 z-toast flex w-max max-w-[calc(100%-32px)] -translate-x-1/2 flex-col-reverse gap-2 outline-none',
        )}
      />
    </RadixToast.Provider>
  );
}
