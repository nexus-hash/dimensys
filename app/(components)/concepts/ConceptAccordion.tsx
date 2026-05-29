'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useConceptProgress } from '../../(hooks)/useConceptProgress';

interface Concept {
  id: string;
  title: string;
  readTime: string;
  tags: string[];
}

interface Module {
  id: string;
  title: string;
  concepts: Concept[];
}

export default function ConceptAccordion({ mod, categoryId, activeTags }: { mod: Module; categoryId: string; activeTags: string[] }) {
  const [isOpen, setIsOpen] = useState(true); // Default open for now

  // Filter concepts based on active tags
  const filteredConcepts = mod.concepts.filter(concept => {
    if (activeTags.length === 0) return true;
    return activeTags.some(tag => concept.tags?.includes(tag));
  });

  if (filteredConcepts.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#141414] overflow-hidden shadow-sm hover:shadow-md transition-shadow group/accordion">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#141414] hover:from-gray-100 dark:hover:from-[#222] transition-all relative"
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors duration-300 ${isOpen ? 'bg-orange-500' : 'bg-transparent group-hover/accordion:bg-orange-500/50'}`}></div>
        
        <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white text-left ml-2">{mod.title}</h3>
        
        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 dark:bg-white/5 transform transition-all duration-300 ${isOpen ? 'rotate-180 bg-orange-500/10 text-orange-500 shadow-[0_0_10px_rgba(255,102,0,0.2)]' : 'text-gray-500'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </button>

      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 md:p-6 space-y-4 bg-white dark:bg-[#121212]">
          {filteredConcepts.map(concept => (
            <ConceptItem key={concept.id} concept={concept} categoryId={categoryId} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ConceptItem({ concept, categoryId }: { concept: Concept; categoryId: string }) {
  const progress = useConceptProgress(concept.id);

  return (
    <Link href={`/concepts/${categoryId.toLowerCase()}/${concept.id}`} className="block">
      <div className="p-5 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#1a1a1a] hover:-translate-y-1 hover:border-orange-500/50 hover:shadow-[0_8px_30px_rgba(255,102,0,0.12)] transition-all cursor-pointer relative overflow-hidden group">
        <div className="flex justify-between items-center mb-3">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{concept.title}</h4>
          <span className="text-sm text-gray-500 bg-gray-200 dark:bg-white/10 px-3 py-1 rounded-full">{concept.readTime}</span>
        </div>
        
        {/* Tags */}
        {concept.tags && (
          <div className="flex flex-wrap gap-2 mb-3">
            {concept.tags.map(tag => (
              <span key={tag} className="text-xs text-gray-500 dark:text-gray-400">#{tag}</span>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden">
          <div 
            className="h-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress > 0 && progress < 100 && (
          <p className="text-xs text-orange-500 mt-1 text-right">{Math.round(progress)}% Read</p>
        )}
        {progress === 100 && (
          <p className="text-xs text-green-500 mt-1 text-right">Completed</p>
        )}
      </div>
    </Link>
  );
}
