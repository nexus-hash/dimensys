'use client';

import * as React from 'react';
import { Tabs } from '@/app/(components)/ui';

export interface InspectorTabsProps {
  items: Array<{ value: string; label: string }>;
  /** Which tab starts active. Defaults to `items[0].value` (first-appearance order) when omitted. */
  defaultValue?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}

/**
 * The only client-side piece of the inspector body (T3.6): owns which pane
 * is active. Everything under it — `TabsContent` per pane — is server-
 * rendered markup handed down as `children`, so switching panes is a pure
 * DOM show/hide, no markdown/shiki re-render and no extra fetch.
 */
export function InspectorTabs({ items, defaultValue, ariaLabel, children }: InspectorTabsProps) {
  const [value, setValue] = React.useState(defaultValue ?? items[0]?.value ?? '');
  return (
    <Tabs items={items} value={value} onValueChange={setValue} aria-label={ariaLabel}>
      {children}
    </Tabs>
  );
}
