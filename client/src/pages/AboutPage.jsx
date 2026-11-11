import { Page } from '../components/layout/Layout.jsx';
import Button from '../components/ui/Button.jsx';
import Loader from '../components/ui/Loader.jsx';
import { ErrorState } from '../components/ui/EmptyState.jsx';
import HowItWorks from '../components/home/HowItWorks.jsx';
import { useSiteContent } from '../hooks/useApi.js';

export default function AboutPage() {
  const { data: content, isLoading, error, refetch } = useSiteContent();
  if (isLoading) return <Loader fullPage />;
  if (error) return <Page><ErrorState error={error} onRetry={refetch} /></Page>;

  return (
    <>
      <Page title={content.about.title} narrow>
        <div className="space-y-4 text-lg leading-relaxed text-slate-600">
          {content.about.paragraphs.map((p) => <p key={p}>{p}</p>)}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/shop">{content.hero.primaryCta}</Button>
          <Button to="/sell" variant="orange">{content.hero.secondaryCta}</Button>
        </div>
      </Page>
      <HowItWorks content={content.howItWorks} />
    </>
  );
}
