export default function Avatar() {
  return (
    <button
      className="w-8 h-8 rounded-full border border-light-secondary/20 dark:border-dark-secondary/20 bg-transparent flex items-center justify-center text-light-secondary/70 dark:text-dark-secondary/70 hover:border-orange-500/50 hover:text-orange-500 dark:hover:text-orange-400 transition-colors duration-200 overflow-hidden"
      aria-label="User profile"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
    </button>
  );
}