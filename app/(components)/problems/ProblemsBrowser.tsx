'use client';

import { useCallback, useRef, useState } from 'react';
import ProblemCard, { type Problem } from './ProblemCard';
import CategoryFilter from './CategoryFilter';

const ITEMS_PER_PAGE = 8; // How many cards a scroll page reveals.

export interface ProblemsBrowserProps {
  /** Every catalog card (T3.13: from `catalog.json`, loaded server-side by the page). */
  problems: Problem[];
  /** Distinct `problem.type` values, for the category pills. */
  categories: string[];
}

/**
 * Client-side category filter + "load more on scroll" over an already
 * server-loaded problem list (T3.13). Previously this fetched per-category
 * JSON files at request time (`/engine/data/<category>.file`, the old
 * TSX-codegen manifest's static assets); the full catalog is now small
 * enough, and already loaded once server-side, that filtering/paging can
 * happen entirely client-side with no network round trip.
 */
export default function ProblemsBrowser({ problems, categories }: ProblemsBrowserProps) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const observer = useRef<IntersectionObserver | null>(null);

  /** Selecting a category resets the page count in the same event, no effect needed. */
  const handleSelectCategory = useCallback((category: string) => {
    setActiveCategory(category);
    setPage(1);
  }, []);

  const filtered = activeCategory === 'All' ? problems : problems.filter((p) => p.type === activeCategory);
  const displayed = filtered.slice(0, page * ITEMS_PER_PAGE);
  const hasMore = displayed.length < filtered.length;

  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [hasMore],
  );

  const categoryNames = ['All', ...categories];

  return (
    <>
      <CategoryFilter categories={categoryNames} activeCategory={activeCategory} onSelect={handleSelectCategory} />

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 scroll-visible-up mt-8"
        style={{ animationDelay: '0.3s' }}
      >
        {displayed.map((problem, index) => {
          const isLast = index === displayed.length - 1;
          return (
            <div key={problem.id} ref={isLast ? lastElementRef : null} className="h-full">
              <ProblemCard problem={problem} showType={activeCategory === 'All'} />
            </div>
          );
        })}
      </div>

      {displayed.length === 0 && (
        <div className="text-center py-20 text-gray-500">No problems found for this category.</div>
      )}
    </>
  );
}
