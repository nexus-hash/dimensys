import { notFound } from 'next/navigation';
import { CanvasGallery } from './CanvasGallery';

export const metadata = {
  title: 'DS5 canvas kit — /dev/ui/canvas',
  robots: { index: false, follow: false },
};

/**
 * Living gallery for the canvas visual kit: every node type × health
 * state, link styles, group frames, DSA cells + markers, and an LLD card, in
 * both themes. Development only — 404s in production, same as `/dev/ui`.
 */
export default function DevUiCanvasPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <CanvasGallery />;
}
