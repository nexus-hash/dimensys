import type { Metadata } from 'next';
import { ComingSoon } from '../(components)/site/ComingSoon';

export const metadata: Metadata = {
  title: 'Daily — dimensys',
  description: "Today's outage: a new broken system every day. Coming soon.",
};

export default function DailyPage() {
  return (
    <ComingSoon
      eyebrow="Daily outage"
      title="A new broken system, every day."
      body="Diagnose it, fix it, and compare notes with everyone who tried it today."
    />
  );
}
