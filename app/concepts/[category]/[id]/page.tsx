import { notFound } from 'next/navigation';
import Navbar from '../../../(components)/navbar/Navbar';
import CircuitBackground from '../../../(components)/problems/CircuitBackground';
import ConceptDetailClient from '../../../(components)/concepts/ConceptDetailClient';
import { loadConceptContent, loadConceptsCategory, loadConceptsIndex } from '../../../(server)/engine/publicData';
import type { Concept, Module } from '../../../(components)/concepts/ConceptAccordion';

/**
 * `/concepts/[category]/[id]` (CLEAN-A): fully static, like `/solutions/[id]`
 * — every valid (category, concept id) pair from the synced concept
 * curriculum data is prerendered at build time; `dynamicParams = false`
 * means any other pair 404s with no runtime `fs` access.
 */
export const dynamicParams = false;

async function loadCategoryModules(categoryId: string): Promise<Module[]> {
  const data = await loadConceptsCategory(categoryId);
  return data.modules ?? [];
}

export async function generateStaticParams(): Promise<Array<{ category: string; id: string }>> {
  const index = await loadConceptsIndex();
  const params: Array<{ category: string; id: string }> = [];
  for (const category of index.categories) {
    const modules = await loadCategoryModules(category.id);
    for (const mod of modules) {
      for (const concept of mod.concepts ?? []) {
        params.push({ category: category.id, id: concept.id });
      }
    }
  }
  return params;
}

export default async function ConceptDetailPage({ params }: { params: Promise<{ category: string; id: string }> }) {
  const { category, id } = await params;

  let curriculum: Module[];
  try {
    curriculum = await loadCategoryModules(category);
  } catch {
    notFound();
  }

  const flatConcepts: Concept[] = curriculum.flatMap((m) => m.concepts || []);
  const currentIndex = flatConcepts.findIndex((c) => c.id === id);
  if (currentIndex === -1) notFound();

  const current = flatConcepts[currentIndex];
  const fileName = current.contentFile ?? `${id}.md`;
  const content = await loadConceptContent(fileName);

  const prevConcept = currentIndex > 0 ? flatConcepts[currentIndex - 1] : null;
  const nextConcept = currentIndex < flatConcepts.length - 1 ? flatConcepts[currentIndex + 1] : null;

  return (
    <div className="flex h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans overflow-hidden relative">
      <CircuitBackground />
      <Navbar />

      <ConceptDetailClient
        category={category}
        id={id}
        curriculum={curriculum}
        content={content}
        prevConcept={prevConcept}
        nextConcept={nextConcept}
      />
    </div>
  );
}
