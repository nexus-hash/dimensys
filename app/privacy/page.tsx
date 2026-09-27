import type { Metadata } from 'next';
import { ComingSoon } from '../(components)/site/ComingSoon';

export const metadata: Metadata = {
  title: 'Privacy — dimensys',
  description: 'Privacy policy for dimensys.',
};

export default function PrivacyPage() {
  return (
    <ComingSoon
      eyebrow="Privacy"
      title="Privacy policy"
      body="dimensys has no accounts yet and collects no personal data beyond standard hosting logs. A full policy is on its way."
    />
  );
}
