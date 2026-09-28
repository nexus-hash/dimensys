import Navbar from './(components)/navbar/Navbar';
import Footer from './(components)/footer/Footer';
import CircuitBackground from './(components)/problems/CircuitBackground';
import { Hero, HERO_DIAGRAM_ID } from './(components)/home/Hero';
import { ShowcaseSection } from './(components)/home/ShowcaseSection';
import { ClosingCta } from './(components)/home/ClosingCta';
import { BreakFixVisual } from './(components)/home/BreakFixVisual';
import { ReplaysVisual } from './(components)/home/ReplaysVisual';
import { WalkthroughVisual } from './(components)/home/WalkthroughVisual';
import { ShareVisual } from './(components)/home/ShareVisual';
import { loadPlayerDiagram } from './(server)/engine/publicData';
import { walkthroughHref } from './(components)/player/walkthrough/url';

/**
 * Home (S4.6a). Structure and copy follow the approved design intent: one
 * hero (the live embedded player) plus one capability per showcase section
 * below the fold — never a catalog grid, task list or row of cards. Two
 * showcase sections (Outage replays, Share) describe capabilities that
 * aren't built yet; they render honest static layouts with a "Coming soon"
 * marker instead of faking the feature. The third is the walkthrough
 * capability, which is real and shipped today.
 */
export default async function Home() {
  // "Take the walkthrough" opens the player straight on the first one.
  const hero = await loadPlayerDiagram(HERO_DIAGRAM_ID);
  const firstWalkthrough = hero?.stories.find((s) => s.frames.length > 0);
  const walkthroughLink = firstWalkthrough ? walkthroughHref(HERO_DIAGRAM_ID, firstWalkthrough.id) : `/solutions/${HERO_DIAGRAM_ID}`;

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-light-primary font-sans dark:bg-dark-primary">
      <CircuitBackground />
      <Navbar />
      <main aria-labelledby="home-heading" className="flex w-full flex-col items-center">
        <Hero />

        <ShowcaseSection
          index="01"
          eyebrow="Break → Fix"
          headingId="home-show-fix"
          heading="Watch it fail. Then fix it and watch it recover."
          body="Slow the database and retries pile up until every request times out. Every number is computed live from the diagram, never played back."
          link={{ href: `/solutions/${HERO_DIAGRAM_ID}`, label: 'Try it in the simulator' }}
          visual={<BreakFixVisual />}
        />

        <ShowcaseSection
          index="02"
          eyebrow="Outage replays"
          headingId="home-show-replays"
          heading="Relive the outages that made the news."
          body="Real incidents, rebuilt from public postmortems. Scrub to the minute it tipped over and follow the chain reaction, one hop at a time."
          comingSoon
          visual={<ReplaysVisual />}
          flip
        />

        <ShowcaseSection
          index="03"
          eyebrow="Walkthroughs"
          headingId="home-show-walkthrough"
          heading="Every step, explained in plain words."
          body="Guided walkthroughs follow one request, hop by hop, through the real diagram — no narration is invented, it's read straight from the same data the player runs on."
          link={{ href: walkthroughLink, label: 'Take the walkthrough' }}
          visual={<WalkthroughVisual diagramId={HERO_DIAGRAM_ID} />}
        />

        <ShowcaseSection
          index="04"
          eyebrow="Share"
          headingId="home-show-share"
          heading="Every meltdown will be a link."
          body="The URL will follow the simulation as you play, so a teammate can open the exact second the cache died."
          comingSoon
          visual={<ShareVisual />}
          flip
        />

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
