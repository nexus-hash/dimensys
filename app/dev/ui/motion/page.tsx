import { notFound } from 'next/navigation';
import { MotionGallery } from './MotionGallery';

export const metadata = {
  title: 'DS6 motion system — /dev/ui/motion',
  robots: { index: false, follow: false },
};

/**
 * Living gallery for the motion module: every signature-moment preset (full
 * motion + reduced variant), the spring utility, `NumberRoll`, and the View
 * Transitions helper. Development only — 404s in production, same as
 * `/dev/ui`.
 */
export default function DevUiMotionPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <MotionGallery />;
}
