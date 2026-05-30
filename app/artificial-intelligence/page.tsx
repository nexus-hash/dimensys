'use client';

import { useState } from 'react';
import Navbar from '../(components)/navbar/Navbar';
import Footer from '../(components)/footer/Footer';
import CircuitBackground from '../(components)/problems/CircuitBackground';
import CategoryFilter from '../(components)/problems/CategoryFilter';
import Link from 'next/link';

import Image from 'next/image';

const AI_TOPICS = [
  { id: 'transformer', title: 'Transformer Architecture', category: 'Deep Learning', description: 'Foundation for modern LLMs and complex sequence learning.', image: '/images/ai-assets/transformer.png' },
  { id: 'rag', title: 'RAG (Retrieval-Augmented Gen)', category: 'Generative AI', description: 'Enhancing LLMs with real-time dynamic knowledge.', image: '/images/ai-assets/rag.png' },
  { id: 'neural-networks', title: 'Neural Networks', category: 'Deep Learning', description: 'Simulating the human brain for deep pattern recognition.', image: '/images/ai-assets/neural-network.png' },
  { id: 'nlp', title: 'Natural Language Processing', category: 'NLP', description: 'Enhancing for modern language processing.', image: '/images/ai-assets/nlp.png' },
  { id: 'computer-vision', title: 'Computer Vision', category: 'Computer Vision', description: 'Enhancing LLMs with components for computer vision.', image: '/images/ai-assets/computer-vision.png' }
];

export default function AiConceptsPage() {
  const categories = ['All', 'Deep Learning', 'Generative AI', 'NLP', 'Computer Vision'];
  const [activeCategory, setActiveCategory] = useState('All');

  const displayedTopics = activeCategory === 'All' 
    ? AI_TOPICS 
    : AI_TOPICS.filter(t => t.category === activeCategory);

  return (
    <div className="flex min-h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans relative overflow-x-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50 z-0"></div>
      <CircuitBackground />
      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center pt-24 pb-20 px-4 z-10 relative">
        <div className="w-full xl:max-w-7xl">
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold text-light-secondary dark:text-dark-secondary mb-4 tracking-tight">
              Explore <span className="text-orange-500 drop-shadow-[0_0_15px_rgba(255,102,0,0.5)]">Artificial Intelligence</span>
            </h1>
            
            <div className="mt-8 flex justify-center">
              <CategoryFilter 
                categories={categories} 
                activeCategory={activeCategory} 
                onSelect={setActiveCategory} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTopics.map((topic) => (
              <Link key={topic.id} href={`/artificial-intelligence/${topic.id}`}>
                <div className="h-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-[#151515]/80 backdrop-blur-md p-6 hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(255,102,0,0.2)] group cursor-pointer flex flex-col">
                  <div className="flex-1">
                    <div className="w-full h-40 mb-4 rounded-xl overflow-hidden relative group-hover:scale-[1.02] transition-transform">
                      <Image 
                        src={topic.image} 
                        alt={topic.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{topic.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{topic.description}</p>
                  </div>
                  <div className="mt-6 flex items-center text-sm font-medium text-orange-500">
                    Learn More 
                    <svg className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
