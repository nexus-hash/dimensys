'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import MarkdownRenderer from './MarkdownRenderer';
import { saveConceptProgress } from '../../(hooks)/useConceptProgress';
import type { Module, Concept } from './ConceptAccordion';

export default function ConceptDetailClient({
  category,
  id,
  curriculum,
  content,
  prevConcept,
  nextConcept,
}: {
  category: string;
  id: string;
  curriculum: Module[];
  content: string;
  prevConcept: Concept | null;
  nextConcept: Concept | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const totalScrollable = scrollHeight - clientHeight;

        if (totalScrollable <= 0) {
          saveConceptProgress(id, 100);
        } else {
          const percentage = (scrollTop / totalScrollable) * 100;
          saveConceptProgress(id, percentage);
        }
      }
    };

    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [id, content]);

  return (
    <div className="flex flex-1 pt-16 overflow-hidden w-full max-w-7xl mx-auto">
      <aside className="w-64 border-r border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-surface-page/80 backdrop-blur-md relative z-10 overflow-y-auto hidden md:block [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="p-6">
          <h2 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-6">Curriculum</h2>
          <div className="space-y-6">
            {curriculum.map((mod) => (
              <div key={mod.id}>
                <h3 className="text-gray-900 dark:text-white font-semibold mb-2">{mod.title}</h3>
                <ul className="space-y-1">
                  {mod.concepts?.map((c) => {
                    const isActive = c.id === id;
                    return (
                      <li key={c.id}>
                        <Link
                          href={`/concepts/${category}/${c.id}`}
                          className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            isActive
                              ? 'bg-orange-500 text-white font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white'
                          }`}
                        >
                          {c.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8 md:p-12 relative bg-light-primary dark:bg-dark-primary z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div className="absolute inset-0 grid-bg pointer-events-none opacity-30 z-0"></div>

        <div className="relative z-10 max-w-4xl mx-auto">
          <MarkdownRenderer content={content} />

          {(prevConcept || nextConcept) && (
            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 pb-12">
              {prevConcept ? (
                <Link
                  href={`/concepts/${category}/${prevConcept.id}`}
                  className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-orange-500 text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors w-full sm:w-auto text-center"
                >
                  ← Previous: {prevConcept.title}
                </Link>
              ) : (
                <div />
              )}

              {nextConcept ? (
                <Link
                  href={`/concepts/${category}/${nextConcept.id}`}
                  className="px-6 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(255,102,0,0.3)] transition-all w-full sm:w-auto text-center"
                >
                  Next: {nextConcept.title} →
                </Link>
              ) : (
                <div />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
