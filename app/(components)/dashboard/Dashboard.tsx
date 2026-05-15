import HeroSection from './HeroSection';
import ConceptsSection from './ConceptsSection';
import LearningPath from './LearningPath';
import StatsBar from './StatsBar';
import FeatureShowcase from './FeatureShowcase';

export default function Dashboard() {
  return (
    <main className="flex flex-col w-full">
      <ConceptsSection />
      <LearningPath />
      <StatsBar />
      <FeatureShowcase />
    </main>
  );
}
