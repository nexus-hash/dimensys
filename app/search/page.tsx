'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '../(components)/navbar/Navbar';
import Footer from '../(components)/footer/Footer';
import CircuitBackground from '../(components)/problems/CircuitBackground';
import Link from 'next/link';
import { searchContent } from '@/lib/search';

interface Concept {
  id: string;
  title: string;
  readTime: string;
  contentFile: string;
  tags: string[];
  moduleTitle: string;
  category: string;
  categorySlug: string;
}

interface Problem {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  tags: string[];
  isAccessible: boolean;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function performSearch() {
      setLoading(true);
      const results = await searchContent(query);
      setConcepts(results.concepts);
      setProblems(results.problems);
      setLoading(false);
    }

    if (query.trim().length >= 2) {
      performSearch();
    } else {
      setConcepts([]);
      setProblems([]);
      setLoading(false);
    }
  }, [query]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30 bg-green-100 dark:bg-green-500/10';
      case 'Medium':
        return 'text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30 bg-yellow-100 dark:bg-yellow-500/10';
      case 'Hard':
        return 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10';
      default:
        return 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-400/30 bg-gray-100 dark:bg-gray-400/10';
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-light-primary dark:bg-dark-primary text-light-secondary dark:text-dark-secondary">
      <CircuitBackground />
      <Navbar />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Header */}
        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Search Results
            {query && <span className="text-orange-500"> "{query}"</span>}
          </h1>
          <p className="text-light-secondary/70 dark:text-dark-secondary/70 text-lg">
            {loading ? 'Searching...' : `Found ${concepts.length} concepts and ${problems.length} problems`}
          </p>
        </div>

        {/* No Results */}
        {!loading && concepts.length === 0 && problems.length === 0 && query.trim().length >= 2 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold mb-2">No results found</h2>
            <p className="text-light-secondary/60 dark:text-dark-secondary/60 mb-8">
              Try searching with different keywords or check the concepts and problems pages directly.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/concepts"
                className="px-6 py-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-500 hover:bg-orange-500/20 transition-colors"
              >
                Browse Concepts
              </Link>
              <Link
                href="/problems"
                className="px-6 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-500 hover:bg-blue-500/20 transition-colors"
              >
                Browse Problems
              </Link>
            </div>
          </div>
        )}

        {/* Concepts Section */}
        {!loading && concepts.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
              <span className="text-orange-500">📚</span> Concepts ({concepts.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {concepts.map(concept => (
                <Link key={concept.id} href={`/concepts/${concept.categorySlug}/${concept.id}`}>
                  <div className="h-full bg-light-primary dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 p-6 rounded-2xl hover:-translate-y-1 hover:shadow-[0_4px_30px_rgba(255,102,0,0.15)] transition-all duration-300 group cursor-pointer">
                    <div className="mb-4">
                      <span className="text-xs font-medium tracking-wider text-orange-500 uppercase">
                        {concept.category}
                      </span>
                      <p className="text-xs text-light-secondary/50 dark:text-dark-secondary/50 mt-1">
                        {concept.moduleTitle}
                      </p>
                    </div>
                    <h3 className="text-xl font-bold text-light-secondary dark:text-dark-secondary mb-3 group-hover:text-orange-500 transition-colors line-clamp-2">
                      {concept.title}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {concept.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {concept.tags.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">
                          +{concept.tags.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-light-secondary/60 dark:text-dark-secondary/60">
                      {concept.readTime}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Problems Section */}
        {!loading && problems.length > 0 && (
          <div>
            <h2 className="text-3xl font-bold mb-8 flex items-center gap-2">
              <span className="text-blue-500">💻</span> Problems ({problems.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {problems.map(problem => (
                <Link key={problem.id} href={`/solutions/${problem.id}`}>
                  <div className="h-full bg-light-primary dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 p-6 rounded-2xl hover:-translate-y-1 hover:shadow-[0_4px_30px_rgba(255,102,0,0.15)] transition-all duration-300 group cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-sm font-medium tracking-wider text-orange-500 uppercase">
                        {problem.type}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border ${getDifficultyColor(
                          problem.difficulty
                        )}`}
                      >
                        {problem.difficulty}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-light-secondary dark:text-dark-secondary mb-3 group-hover:text-orange-500 transition-colors line-clamp-2">
                      {problem.title}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {problem.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                      {problem.tags.length > 3 && (
                        <span className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">
                          +{problem.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && query.trim().length < 2 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔎</div>
            <h2 className="text-2xl font-bold mb-2">Start searching</h2>
            <p className="text-light-secondary/60 dark:text-dark-secondary/60">
              Enter at least 2 characters to see search results for concepts and problems.
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block">
              <div className="w-12 h-12 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
            </div>
            <p className="mt-4 text-light-secondary/60 dark:text-dark-secondary/60">Searching...</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
