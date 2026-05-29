'use client';

interface CategoryFilterProps {
  categories: string[];
  activeCategory: string;
  onSelect: (category: string) => void;
}

export default function CategoryFilter({ categories, activeCategory, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex space-x-2 overflow-x-auto pb-4 no-scrollbar">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelect(cat)}
          className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
            activeCategory === cat
              ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(255,102,0,0.4)] border-transparent'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
