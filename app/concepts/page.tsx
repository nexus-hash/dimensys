import type { Metadata } from 'next';
import Navbar from '../(components)/navbar/Navbar';
import Footer from '../(components)/footer/Footer';
import CircuitBackground from '../(components)/problems/CircuitBackground';
import ConceptsBrowser, { type ConceptsCategory } from '../(components)/concepts/ConceptsBrowser';
import type { Module } from '../(components)/concepts/ConceptAccordion';
import { loadConceptsCategory, loadConceptsIndex } from '../(server)/engine/publicData';

export const metadata: Metadata = {
  title: 'Concepts — Dimensys',
  description:
    'Master the foundational concepts of software architecture, system design, and algorithms before diving into complex problems.',
};

export default async function ConceptsPage() {
  const index = await loadConceptsIndex();
  const categories: ConceptsCategory[] = [{ id: 'All', title: 'All' }, ...index.categories.map((c) => ({ id: c.id, title: c.title }))];

  const modulesByCategory: Record<string, Module[]> = {};
  await Promise.all(
    index.categories.map(async (c) => {
      const data = await loadConceptsCategory(c.id);
      modulesByCategory[c.id] = data.modules ?? [];
    }),
  );

  return (
    <div className="flex min-h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans relative overflow-x-hidden">
      <CircuitBackground />
      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center pt-24 pb-20 px-4 z-10 relative">
        <div className="w-full xl:max-w-4xl">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-light-secondary dark:text-dark-secondary tracking-tight mb-4">
              <span className="text-orange-500">Concepts</span> Curriculum
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
              Master the foundational concepts of software architecture, system design, and algorithms before diving into complex problems.
            </p>
          </div>

          <ConceptsBrowser categories={categories} modulesByCategory={modulesByCategory} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
