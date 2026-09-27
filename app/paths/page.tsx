import type { Metadata } from 'next';
import { ComingSoon } from '../(components)/site/ComingSoon';

export const metadata: Metadata = {
  title: 'Paths — dimensys',
  description: 'Guided learning paths through system design. Coming soon.',
};

export default function PathsPage() {
  return (
    <ComingSoon
      eyebrow="Learning paths"
      title="A guided route through system design."
      body="Ordered sequences of systems and concepts, building from the fundamentals to the failure modes that trip up real interviews."
    />
  );
}
