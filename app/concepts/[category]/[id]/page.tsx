'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import Navbar from '../../../(components)/navbar/Navbar';
import MarkdownRenderer from '../../../(components)/concepts/MarkdownRenderer';
import CircuitBackground from '../../../(components)/problems/CircuitBackground';
import { saveConceptProgress } from '../../../(hooks)/useConceptProgress';

export default function ConceptDetailPage({ params }: { params: Promise<{ category: string, id: string }> }) {
  const { category, id } = use(params);
  const [content, setContent] = useState<string>('');
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/engine/data/concepts/${category}.json`)
      .then(res => res.json())
      .then(data => {
        if (data.modules) setCurriculum(data.modules);
      })
      .catch(console.error);
  }, [category]);

  useEffect(() => {
    let fileName = `${id}.md`;
    if (curriculum.length > 0) {
       for (const mod of curriculum) {
         const found = mod.concepts?.find((c: any) => c.id === id);
         if (found && found.contentFile) {
           fileName = found.contentFile;
           break;
         }
       }
       fetch(`/engine/data/concepts/content/${fileName}`)
         .then(res => res.text())
         .then(text => setContent(text))
         .catch(console.error);
    }
  }, [id, curriculum]);

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

  let prevConcept = null;
  let nextConcept = null;
  const flatConcepts = curriculum.flatMap(m => m.concepts || []);
  const currentIndex = flatConcepts.findIndex(c => c.id === id);
  
  if (currentIndex > 0) prevConcept = flatConcepts[currentIndex - 1];
  if (currentIndex < flatConcepts.length - 1) nextConcept = flatConcepts[currentIndex + 1];

  return (
    <div className="flex h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans overflow-hidden relative">
      <CircuitBackground />
      <Navbar />

      <div className="flex flex-1 pt-16 overflow-hidden w-full max-w-7xl mx-auto">
        <aside className="w-64 border-r border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-[#121212]/80 backdrop-blur-md relative z-10 overflow-y-auto hidden md:block [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="p-6">
            <h2 className="text-sm font-bold text-orange-500 uppercase tracking-widest mb-6">Curriculum</h2>
            <div className="space-y-6">
              {curriculum.map((mod: any) => (
                <div key={mod.id}>
                  <h3 className="text-gray-900 dark:text-white font-semibold mb-2">{mod.title}</h3>
                  <ul className="space-y-1">
                    {mod.concepts?.map((c: any) => {
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
            {content ? (
              <MarkdownRenderer content={content} />
            ) : (
              <div className="animate-pulse space-y-4 mt-12">
                <div className="h-8 bg-gray-200 dark:bg-white/10 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-full mt-8"></div>
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-full"></div>
                <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-5/6"></div>
              </div>
            )}

            {(prevConcept || nextConcept) && (
              <div className="mt-16 pt-8 border-t border-gray-200 dark:border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 pb-12">
                {prevConcept ? (
                  <Link href={`/concepts/${category}/${prevConcept.id}`} className="px-6 py-3 rounded-xl border border-gray-200 dark:border-white/10 hover:border-orange-500 text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors w-full sm:w-auto text-center">
                    ← Previous: {prevConcept.title}
                  </Link>
                ) : <div />}
                
                {nextConcept ? (
                  <Link href={`/concepts/${category}/${nextConcept.id}`} className="px-6 py-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-[0_0_15px_rgba(255,102,0,0.3)] transition-all w-full sm:w-auto text-center">
                    Next: {nextConcept.title} →
                  </Link>
                ) : <div />}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
