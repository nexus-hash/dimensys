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

interface SearchResult {
  concepts: Concept[];
  problems: Problem[];
}

// Fetch all concepts from all categories
export async function fetchAllConcepts(): Promise<Concept[]> {
  try {
    const indexResponse = await fetch('/engine/data/concepts/index.json?t=' + Date.now());
    const indexData = await indexResponse.json();
    const categories = indexData.categories;

    let allConcepts: Concept[] = [];

    for (const category of categories) {
      const categoryResponse = await fetch(`/engine/data/concepts/${category.file}?t=` + Date.now());
      const categoryData = await categoryResponse.json();

      if (categoryData.modules && Array.isArray(categoryData.modules)) {
        categoryData.modules.forEach((module: any) => {
          if (module.concepts && Array.isArray(module.concepts)) {
            module.concepts.forEach((concept: any) => {
              allConcepts.push({
                id: concept.id,
                title: concept.title,
                readTime: concept.readTime,
                contentFile: concept.contentFile,
                tags: concept.tags || [],
                moduleTitle: module.title,
                category: categoryData.category || category.title,
                categorySlug: category.id,
              });
            });
          }
        });
      }
    }

    return allConcepts;
  } catch (error) {
    console.error('Error fetching concepts:', error);
    return [];
  }
}

// Fetch all problems from all categories
export async function fetchAllProblems(): Promise<Problem[]> {
  try {
    const indexResponse = await fetch('/engine/data/index.json?t=' + Date.now());
    const indexData = await indexResponse.json();
    const categories = indexData.categories;

    let allProblems: Problem[] = [];

    for (const category of categories) {
      const categoryResponse = await fetch(`/engine/data/${category.file}?t=` + Date.now());
      const categoryData = await categoryResponse.json();

      const problemsList = Array.isArray(categoryData) ? categoryData : (categoryData.problems || []);

      if (Array.isArray(problemsList)) {
        allProblems = allProblems.concat(
          problemsList.map((problem: any) => ({
            id: problem.id,
            title: problem.title,
            type: problem.type,
            difficulty: problem.difficulty,
            tags: problem.tags || [],
            isAccessible: problem.isAccessible !== false,
          }))
        );
      }
    }

    return allProblems;
  } catch (error) {
    console.error('Error fetching problems:', error);
    return [];
  }
}

// Search function to filter concepts and problems
function matchesQuery(query: string, items: Array<any>): Array<any> {
  const lowerQuery = query.toLowerCase();
  return items.filter(item => {
    const titleMatch = item.title && item.title.toLowerCase().includes(lowerQuery);
    const tagsMatch = item.tags && item.tags.some((tag: string) => tag.toLowerCase().includes(lowerQuery));
    const moduleTitleMatch = item.moduleTitle && item.moduleTitle.toLowerCase().includes(lowerQuery);
    const categoryMatch = item.category && item.category.toLowerCase().includes(lowerQuery);
    const typeMatch = item.type && item.type.toLowerCase().includes(lowerQuery);
    const difficultyMatch = item.difficulty && item.difficulty.toLowerCase().includes(lowerQuery);
    const idMatch = item.id && item.id.toLowerCase().includes(lowerQuery);

    return !!(titleMatch || tagsMatch || moduleTitleMatch || categoryMatch || typeMatch || difficultyMatch || idMatch);
  });
}

// Main search function
export async function searchContent(query: string): Promise<SearchResult> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery || trimmedQuery.length < 2) {
    return { concepts: [], problems: [] };
  }

  const [concepts, problems] = await Promise.all([fetchAllConcepts(), fetchAllProblems()]);

  const filteredConcepts = matchesQuery(trimmedQuery, concepts) as Concept[];
  const filteredProblems = matchesQuery(trimmedQuery, problems) as Problem[];

  return {
    concepts: filteredConcepts,
    problems: filteredProblems,
  };
}
