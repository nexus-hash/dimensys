import ScrollReveal from './ScrollReveal';
import ConceptCard from './ConceptCard';

/* ── Icon SVGs ── */

const HLDIcon = (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
    <rect x="16" y="4" width="16" height="12" rx="3" />
    <rect x="4" y="32" width="14" height="12" rx="3" />
    <rect x="30" y="32" width="14" height="12" rx="3" />
    <line x1="24" y1="16" x2="24" y2="24" />
    <line x1="24" y1="24" x2="11" y2="32" />
    <line x1="24" y1="24" x2="37" y2="32" />
    <circle cx="24" cy="24" r="2" fill="currentColor" />
  </svg>
);

const LLDIcon = (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
    <rect x="8" y="4" width="32" height="40" rx="3" />
    <line x1="8" y1="16" x2="40" y2="16" />
    <line x1="8" y1="28" x2="40" y2="28" />
    <text x="24" y="12" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" fontWeight="bold">UserService</text>
    <text x="14" y="24" fontSize="5" fill="currentColor" stroke="none" opacity="0.6">- name: str</text>
    <text x="14" y="36" fontSize="5" fill="currentColor" stroke="none" opacity="0.6">+ getName()</text>
  </svg>
);

const DSAIcon = (
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
    <circle cx="24" cy="8" r="5" />
    <circle cx="12" cy="24" r="5" />
    <circle cx="36" cy="24" r="5" />
    <circle cx="6" cy="40" r="4" />
    <circle cx="18" cy="40" r="4" />
    <circle cx="30" cy="40" r="4" />
    <circle cx="42" cy="40" r="4" />
    <line x1="21" y1="12" x2="14" y2="20" />
    <line x1="27" y1="12" x2="34" y2="20" />
    <line x1="10" y1="28" x2="7" y2="36" />
    <line x1="14" y1="28" x2="17" y2="36" />
    <line x1="34" y1="28" x2="31" y2="36" />
    <line x1="38" y1="28" x2="41" y2="36" />
  </svg>
);

export default function ConceptsSection() {
  return (
    <section id="concepts" className="relative w-full px-6 py-24 sm:py-32">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <ScrollReveal direction="up">
          <div className="text-center mb-16">
            <span className="text-sm uppercase tracking-[0.2em] text-orange-500 dark:text-orange-400 font-medium">
              What You&apos;ll Master
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-bold text-light-secondary dark:text-dark-secondary">
              Explore Core Concepts
            </h2>
            <p className="mt-4 text-light-secondary/50 dark:text-dark-secondary/50 max-w-xl mx-auto">
              Three pillars of software engineering mastery, visualized and interactive.
            </p>
          </div>
        </ScrollReveal>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <ScrollReveal direction="up" delay={0}>
            <ConceptCard
              title="System Design"
              description="Master scalable architecture with load balancers, microservices, databases, caching layers, and distributed system patterns."
              icon={HLDIcon}
              href="/concepts"
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={150}>
            <ConceptCard
              title="Low Level Design"
              description="Deep dive into SOLID principles, design patterns, class diagrams, and clean object-oriented architecture that scales."
              icon={LLDIcon}
              href="/problems"
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={300}>
            <ConceptCard
              title="DSA"
              description="Conquer trees, graphs, sorting, and dynamic programming through visual, step-by-step interactive algorithm walkthroughs."
              icon={DSAIcon}
              href="/data-structures-algorithms"
            />
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
