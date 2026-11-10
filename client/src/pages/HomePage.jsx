import { useEffect } from 'react';
import Hero from '../components/home/Hero.jsx';
import FeaturedCarousel from '../components/home/FeaturedCarousel.jsx';
import HowItWorks from '../components/home/HowItWorks.jsx';
import MessagingSection from '../components/home/MessagingSection.jsx';
import TrustSection from '../components/home/TrustSection.jsx';
import { ErrorState } from '../components/ui/EmptyState.jsx';
import { useSiteContent } from '../hooks/useApi.js';

export default function HomePage() {
  const { data: content, error, refetch } = useSiteContent();

  useEffect(() => {
    document.title = 'Boipotro | Buy & Sell Used Textbooks';
  }, []);

  return (
    <>
      <Hero content={content?.hero} />
      {error && (
        <div className="mx-auto max-w-7xl px-4 pt-8">
          <ErrorState error={error} onRetry={refetch} title="Could not load page content" />
        </div>
      )}
      <FeaturedCarousel content={content?.featured} />
      <HowItWorks content={content?.howItWorks} />
      <MessagingSection content={content?.messaging} />
      <TrustSection content={content?.trust} />
    </>
  );
}
