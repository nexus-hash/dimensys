import Link from 'next/link';

interface Problem {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  tags: string[];
  isAccessible: boolean;
}

export default function ProblemCard({ problem, showType = true }: { problem: Problem, showType?: boolean }) {
  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30 bg-green-100 dark:bg-green-500/10';
      case 'Medium': return 'text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-500/30 bg-yellow-100 dark:bg-yellow-500/10';
      case 'Hard': return 'text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 bg-red-100 dark:bg-red-500/10';
      default: return 'text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-400/30 bg-gray-100 dark:bg-gray-400/10';
    }
  };

  return (
    <div className="bg-light-primary dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 p-6 rounded-2xl flex flex-col justify-between hover:-translate-y-1 hover:shadow-[0_4px_30px_rgba(255,102,0,0.15)] transition-all duration-300 group h-full">
      <div>
        <div className="flex justify-between items-start mb-4">
          {showType ? (
            <>
              <span className="text-sm font-medium tracking-wider text-orange-500 uppercase">{problem.type}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${getDifficultyColor(problem.difficulty)}`}>
                {problem.difficulty}
              </span>
            </>
          ) : (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${getDifficultyColor(problem.difficulty)}`}>
              {problem.difficulty}
            </span>
          )}
        </div>
        <h3 className="text-xl font-bold text-light-secondary dark:text-dark-secondary mb-3 group-hover:text-orange-500 transition-colors">
          {problem.title}
        </h3>
        <div className="flex flex-wrap gap-2 mb-6">
          {problem.tags.map(tag => (
            <span key={tag} className="text-xs px-2 py-1 rounded-md bg-white/5 border border-white/10 text-gray-400">
              {tag}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
        <div className="flex items-center text-sm text-gray-400">
          {!problem.isAccessible && (
            <span className="flex items-center text-orange-500 font-medium">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Premium
            </span>
          )}
        </div>
        <Link href={`/solutions/${problem.id}`} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium rounded-lg transition-colors">
          View Solution
        </Link>
      </div>
    </div>
  );
}
