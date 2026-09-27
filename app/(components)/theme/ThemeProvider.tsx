'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// next-themes renders its own no-flash-of-wrong-theme inline `<script>` with
// `nonce: typeof window === 'undefined' ? nonce : ''` — i.e. it always
// resolves to `''` once hydrating in the browser, regardless of what's
// passed in. If the caller never passes `nonce` (so it's `undefined`), the
// server omits the attribute entirely while the client's hydration pass
// expects `nonce=""`, a genuine attribute mismatch that React flags as
// "Encountered a script tag" during hydration. The real fix is for the
// caller to always pass `nonce=""` (see app/layout.tsx) so both passes
// agree — not to swallow the warning, which used to happen here via a
// `console.error` monkey-patch that hid the message from the console but
// left the underlying mismatch (and the Next.js dev-tools "Issues"
// indicator, which doesn't go through `console.error`) untouched.

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
