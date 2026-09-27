import type { Metadata } from 'next';
import Navbar from '../(components)/navbar/Navbar';
import Footer from '../(components)/footer/Footer';
import CircuitBackground from '../(components)/problems/CircuitBackground';
import ProblemsBrowser from '../(components)/problems/ProblemsBrowser';
import type { Problem } from '../(components)/problems/ProblemCard';
import { loadCatalog } from '../(server)/engine/publicData';

export const metadata: Metadata = {
  title: 'Problems — Dimensys',
  description:
    'Deep dive into comprehensive solutions for High-Level Design, Low-Level Design, and Data Structures to understand the core patterns behind scalable systems.',
};

function familyLabel(family: string): string {
  return family.toUpperCase();
}

function gradeLabel(grade: string): string {
  return grade.length > 0 ? grade.charAt(0).toUpperCase() + grade.slice(1) : grade;
}

/** `catalog.json` cards (T3.13), mapped to the problems grid's existing `Problem` shape. */
async function loadProblems(): Promise<Problem[]> {
  try {
    const catalog = await loadCatalog();
    return catalog.cards
      .slice()
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((card) => ({
        id: card.id,
        title: card.title,
        type: familyLabel(card.family),
        difficulty: gradeLabel(card.grade),
        tags: card.labels,
        isAccessible: card.lifecycle === 'published',
      }));
  } catch {
    // No synced engine output in this environment (e.g. a frontend-only dev
    // server run before the engine step has ever synced). Render an empty
    // grid rather than failing the page.
    return [];
  }
}

export default async function ProblemsPage() {
  const problems = await loadProblems();
  const categories = Array.from(new Set(problems.map((p) => p.type))).sort();

  return (
    <div className="flex min-h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans relative overflow-x-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50 z-0"></div>
      <CircuitBackground />

      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center pt-24 pb-20 px-4 z-10 relative">
        <div className="w-full xl:max-w-7xl">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold text-light-secondary dark:text-dark-secondary mb-4 tracking-tight scroll-visible-up">
              Explore <span className="text-orange-500">Problems</span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mb-8 scroll-visible-up" style={{ animationDelay: '0.1s' }}>
              Deep dive into comprehensive solutions for High-Level Design, Low-Level Design, and Data Structures to
              understand the core patterns behind scalable systems.
            </p>
          </div>

          {problems.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No problems found for this category.</div>
          ) : (
            <ProblemsBrowser problems={problems} categories={categories} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
