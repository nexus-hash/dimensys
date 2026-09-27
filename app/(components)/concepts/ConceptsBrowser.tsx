'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CategoryFilter from '../problems/CategoryFilter';
import ConceptAccordion, { type Module } from './ConceptAccordion';

export interface ConceptsCategory {
  id: string;
  title: string;
}

/**
 * Client-side category/tag filter + "load more on scroll" over data already
 * loaded server-side (the `/concepts` page reads every category's module
 * list once, at build/render time, from the synced concept curriculum
 * data). Previously this fetched `/engine/data/concepts/<category>.json` at
 * request time; there's no network round trip left to make.
 *
 * "All" shows the `hld` category's modules — preserved unchanged from the
 * previous client-fetch behavior (never a merge across categories).
 */
export default function ConceptsBrowser({
  categories,
  modulesByCategory,
}: {
  categories: ConceptsCategory[];
  modulesByCategory: Record<string, Module[]>;
}) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Lazy loading state
  const [visibleModulesCount, setVisibleModulesCount] = useState(2);
  const observerTarget = useRef(null);

  // Drag-to-scroll state for tags
  const tagsScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [dragged, setDragged] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!tagsScrollRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartY(e.pageY - tagsScrollRef.current.offsetTop);
    setScrollTop(tagsScrollRef.current.scrollTop);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tagsScrollRef.current) return;
    e.preventDefault();
    setDragged(true);
    const y = e.pageY - tagsScrollRef.current.offsetTop;
    const walk = (y - startY) * 2;
    tagsScrollRef.current.scrollTop = scrollTop - walk;
  };

  const sourceCategory = activeCategory === 'All' ? 'hld' : activeCategory;
  const modules = useMemo(() => modulesByCategory[sourceCategory] ?? [], [modulesByCategory, sourceCategory]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    modules.forEach((mod) => {
      mod.concepts?.forEach((c) => {
        c.tags?.forEach((t: string) => tags.add(t));
      });
    });
    return Array.from(tags);
  }, [modules]);

  // Reset tag filters + lazy-load count when the category changes — done
  // during render (React's "adjusting state when a prop changes" pattern)
  // rather than in an effect, since this is a pure reaction to a state
  // change, not a sync with an external system.
  const [resetForCategory, setResetForCategory] = useState(activeCategory);
  if (resetForCategory !== activeCategory) {
    setResetForCategory(activeCategory);
    setActiveTags([]);
    setVisibleModulesCount(2);
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleModulesCount((prev) => prev + 2);
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [visibleModulesCount, modules.length]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const visibleModules = modules.slice(0, visibleModulesCount);

  return (
    <>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <CategoryFilter
          categories={categories.map((c) => c.title)}
          activeCategory={activeCategory === 'All' ? 'All' : categories.find((c) => c.id === activeCategory)?.title || 'All'}
          onSelect={(title: string) => {
            const cat = categories.find((c) => c.title === title);
            if (cat) setActiveCategory(cat.id);
          }}
        />

        <div className="pb-4 py-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-6 h-[38px] rounded-full text-sm font-medium border transition-all ${
              showFilters || activeTags.length > 0
                ? 'border-orange-500 text-orange-500 bg-orange-500/10 shadow-[0_0_15px_rgba(255,102,0,0.2)]'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border-white/10'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
            Filters {activeTags.length > 0 && `(${activeTags.length})`}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="mb-8 p-6 rounded-2xl bg-white/50 dark:bg-surface-raised border border-gray-200 dark:border-white/10 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Filter by Tags</h3>
          {allTags.length > 0 ? (
            <div
              ref={tagsScrollRef}
              className={`flex flex-wrap gap-2 overflow-y-auto max-h-32 no-scrollbar pb-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeave}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
            >
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    if (!dragged) toggleTag(tag);
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap select-none ${
                    activeTags.includes(tag)
                      ? 'bg-orange-500 text-white border border-orange-500'
                      : 'bg-transparent text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/20 hover:border-orange-500 hover:text-orange-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-sm italic">No tags available for this category yet.</div>
          )}
        </div>
      )}

      <div className="space-y-6">
        {visibleModules.map((mod) => (
          <ConceptAccordion key={mod.id} mod={mod} categoryId={activeCategory === 'All' ? 'HLD' : activeCategory} activeTags={activeTags} />
        ))}

        {visibleModules.length === 0 && modules.length > 0 && (
          <div className="text-center py-12 text-gray-500">No concepts found matching the selected tags.</div>
        )}

        {visibleModules.length < modules.length && (
          <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </>
  );
}
