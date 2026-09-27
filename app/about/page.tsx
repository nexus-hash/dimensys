import type { Metadata } from 'next';
import { ComingSoon } from '../(components)/site/ComingSoon';

export const metadata: Metadata = {
  title: 'About — dimensys',
  description: 'About dimensys.',
};

export default function AboutPage() {
  return (
    <ComingSoon
      eyebrow="About"
      title="dimensys"
      body="Real architectures, simulated live in your browser. A proper about page is on its way."
    />
  );
}
