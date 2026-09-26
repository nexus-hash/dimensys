import { notFound } from 'next/navigation';
import { DevUiGallery } from './DevUiGallery';

export const metadata = {
  title: 'DS3 primitives — /dev/ui',
  robots: { index: false, follow: false },
};

/**
 * Living component gallery: every primitive, in every state and
 * variant, in both themes. Development only — not linked from the nav, and
 * 404s in production builds so it never ships as a route.
 */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DevUiGallery />;
}
