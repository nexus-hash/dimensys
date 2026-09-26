import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import Navbar from '../../(components)/navbar/Navbar';
import Footer from '../../(components)/footer/Footer';
import CircuitBackground from '../../(components)/problems/CircuitBackground';
import BlueprintClientWrapper from '../../(components)/problems/BlueprintClientWrapper';

interface ProblemMeta {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  tags: string[];
  isAccessible: boolean;
}

function getProblemMeta(problemId: string): ProblemMeta | null {
  const dataDir = path.join(process.cwd(), 'public', 'engine', 'data');
  const files = ['hld.json', 'lld.json', 'dsa.json'];
  
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ProblemMeta[];
        const found = data.find((p) => p.id === problemId);
        if (found) return found;
      } catch (e) {
        console.error(`Failed to parse ${file}`, e);
      }
    }
  }
  return null;
}

const getDifficultyColor = (diff: string) => {
  switch (diff) {
    case 'Easy': return 'text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30 bg-green-100 dark:bg-green-500/10';
    case 'Medium': return 'text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30 bg-yellow-100 dark:bg-yellow-500/10';
    case 'Hard': return 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10';
    default: return 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-400/30 bg-gray-100 dark:bg-gray-400/10';
  }
};

export default async function Page({ params }: { params: Promise<{ problemId: string }> }) {
  const { problemId } = await params;
  
  // Extract slug name by stripping prefix
  const slug = problemId.replace(/^(hld|lld|dsa)-/, '');
  
  // Verify that the solutions directory exists
  const solutionsDir = path.join(process.cwd(), 'app', 'solutions', slug);
  if (!fs.existsSync(solutionsDir)) {
    notFound();
  }

  // Load problem details
  const problem = getProblemMeta(problemId);
  const title = problem?.title || `System Architecture: ${slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  const type = problem?.type || 'HLD';
  const difficulty = problem?.difficulty || 'Medium';
  const tags = problem?.tags || [];

  return (
    <div className="flex min-h-screen flex-col bg-light-primary dark:bg-dark-primary font-sans relative overflow-x-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none opacity-50 z-0"></div>
      <CircuitBackground />
      <Navbar />

      <main className="flex-1 w-full flex flex-col items-center pt-24 pb-20 px-4 z-10 relative">
        <div className="w-full xl:max-w-7xl">
          {/* Header Metadata section */}
          <div className="mb-8 scroll-visible-up">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm font-bold tracking-wider text-orange-500 uppercase">{type}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${getDifficultyColor(difficulty)}`}>
                {difficulty}
              </span>
            </div>
            
            <h1 className="text-3xl md:text-4xl font-extrabold text-light-secondary dark:text-dark-secondary mb-4 tracking-tight">
              {title}
            </h1>

            <div className="flex flex-wrap gap-2 mb-6">
              {tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive 2D Blueprint Visual Container */}
          <div className="scroll-visible-up overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-white/40 dark:bg-black/40 backdrop-blur-md shadow-2xl p-4 md:p-6 min-h-[650px] relative">
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Interactive 2D Architecture Blueprint</span>
            </div>
            <div className="absolute top-4 right-4 z-20 text-[10px] text-gray-400 bg-white/10 dark:bg-black/30 border border-white/5 rounded px-2 py-1 select-none">
              Double Click Canvas to Zoom Out Subsystem
            </div>

            <div className="w-full h-full min-h-[600px] mt-6 relative">
              <BlueprintClientWrapper slug={slug} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
