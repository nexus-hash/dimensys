'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../(components)/navbar/Navbar';
import Footer from '../(components)/footer/Footer';
import ProblemCard from '../(components)/problems/ProblemCard';
import CategoryFilter from '../(components)/problems/CategoryFilter';
import CircuitBackground from '../(components)/problems/CircuitBackground';

interface Problem {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  tags: string[];
  isAccessible: boolean;
}

const ITEMS_PER_PAGE = 8; // Adjust based on how many items to load per scroll

export default function ProblemsPage() {
  const [categories, setCategories] = useState<{ id: string; name: string; file: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [displayedProblems, setDisplayedProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const observer = useRef<IntersectionObserver | null>(null);

  // Fetch Categories index
  useEffect(() => {
    fetch('/engine/data/index.json')
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories);
      })
      .catch((err) => console.error('Failed to load categories', err));
  }, []);

  // Fetch problems when category changes
  useEffect(() => {
    setLoading(true);
    setPage(1);

    if (categories.length === 0) return;

    const fetchProblems = async () => {
      try {
        let fetchedData: Problem[] = [];
        
        if (activeCategory === 'All') {
          // Fetch all categories
          const promises = categories.map(cat => fetch(`/engine/data/${cat.file}`).then(res => res.json()));
          const results = await Promise.all(promises);
          fetchedData = results.flat();
        } else {
          // Fetch specific category
          const categoryMeta = categories.find(c => c.name === activeCategory);
          if (categoryMeta) {
            const res = await fetch(`/engine/data/${categoryMeta.file}`);
            fetchedData = await res.json();
          }
        }

        setAllProblems(fetchedData);
        setDisplayedProblems(fetchedData.slice(0, ITEMS_PER_PAGE));
        setHasMore(fetchedData.length > ITEMS_PER_PAGE);
      } catch (error) {
        console.error('Failed to fetch problems data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [activeCategory, categories]);

  // Handle intersection observer for lazy loading on scroll
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Load more items when page changes
  useEffect(() => {
    if (page > 1) {
      const nextItems = allProblems.slice(0, page * ITEMS_PER_PAGE);
      setDisplayedProblems(nextItems);
      setHasMore(nextItems.length < allProblems.length);
    }
  }, [page, allProblems]);

  const categoryNames = ['All', ...categories.map(c => c.name)];

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
              Deep dive into comprehensive solutions for High-Level Design, Low-Level Design, and Data Structures to understand the core patterns behind scalable systems.
            </p>
            
            <div className="scroll-visible-up" style={{ animationDelay: '0.2s' }}>
              {categories.length > 0 && (
                <CategoryFilter 
                  categories={categoryNames} 
                  activeCategory={activeCategory} 
                  onSelect={setActiveCategory} 
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 scroll-visible-up" style={{ animationDelay: '0.3s' }}>
            {displayedProblems.map((problem, index) => {
              const isLast = index === displayedProblems.length - 1;
              return (
                <div key={problem.id} ref={isLast ? lastElementRef : null} className="h-full">
                  <ProblemCard problem={problem} showType={activeCategory === 'All'} />
                </div>
              );
            })}
          </div>

          {loading && (
            <div className="text-center py-10 text-gray-500">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-500 border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
              </div>
            </div>
          )}

          {!loading && displayedProblems.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              No problems found for this category.
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
