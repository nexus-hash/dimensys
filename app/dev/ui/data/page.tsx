import { notFound } from 'next/navigation';
import { DataGallery } from './DataGallery';

export const metadata = {
  title: 'DS4 data-display kit — /dev/ui/data',
  robots: { index: false, follow: false },
};

/**
 * Living gallery for the data-display kit: StatTile, Meter, Sparkline,
 * DumbbellBars, HealthBadge and RequirementBadge, every state, both themes,
 * plus a streaming sparkline demo. Development only — 404s in production,
 * same gating as `/dev/ui` and `/dev/ui/canvas`.
 */
export default function DevUiDataPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <DataGallery />;
}
