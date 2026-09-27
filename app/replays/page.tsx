import type { Metadata } from 'next';
import { ComingSoon } from '../(components)/site/ComingSoon';

export const metadata: Metadata = {
  title: 'Replays — dimensys',
  description: 'Relive real outages, rebuilt from public postmortems. Coming soon.',
};

export default function ReplaysPage() {
  return (
    <ComingSoon
      eyebrow="Outage replays"
      title="Relive the outages that made the news."
      body="Real incidents, rebuilt from public postmortems. Scrub to the minute it tipped over and follow the chain reaction, one hop at a time."
    />
  );
}
