'use client';

import { useTheme } from 'next-themes';
import { useHasMounted } from '../../(hooks)/useHasMounted';
import { MoonIcon, SunIcon } from '@/app/(components)/ui';

/** Light/dark toggle: a 32px icon button showing the theme it switches to. */
export default function ThemeButton() {
  const mounted = useHasMounted();
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <div className="h-8 w-8 flex-none" />;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-grid h-8 w-8 flex-none place-items-center rounded-control text-ink-secondary transition-colors duration-micro hover:bg-surface-glass hover:text-ink-primary"
      aria-label="Toggle light or dark theme"
    >
      {isDark ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
    </button>
  );
}
