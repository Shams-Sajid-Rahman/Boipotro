import Button from '../ui/Button.jsx';
import SearchBar from '../ui/SearchBar.jsx';
import { Icon } from '../ui/Icons.jsx';
import { Skeleton } from '../ui/Loader.jsx';

/** Shown until a real hero photo is set in site_content.hero.imageUrl. */
function HeroImagePlaceholder({ alt }) {
  return (
    <div role="img" aria-label={alt} className="relative mx-auto aspect-[4/3] w-full max-w-lg">
      <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-brand-blue/40 via-navy-700 to-brand-orange/40" />
      <div className="absolute inset-4 flex items-end justify-center gap-6 rounded-[1.5rem] bg-navy-800/70 p-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-slate-300/80 sm:h-16 sm:w-16" />
            <div className="mt-2 flex h-28 w-24 items-start justify-center rounded-t-3xl bg-slate-300/60 pt-6 sm:h-36 sm:w-28">
              <Icon name="book" className="h-10 w-10 text-brand-orange" />
            </div>
          </div>
        ))}
        <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">Student photo</span>
      </div>
    </div>
  );
}

export default function Hero({ content }) {
  return (
    <section className="relative overflow-hidden bg-navy-900 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-blue/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          {content ? (
            <>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {content.headline} <span className="text-brand-orange">{content.highlight}</span>
              </h1>
              <p className="mt-5 max-w-xl text-base text-slate-300 sm:text-lg">{content.description}</p>
              <div className="mt-8 max-w-xl">
                <SearchBar size="lg" placeholder={content.searchPlaceholder} />
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button to="/shop" variant="blue" size="lg">{content.primaryCta}</Button>
                <Button to="/sell" variant="orange" size="lg">{content.secondaryCta}</Button>
              </div>
            </>
          ) : (
            <div className="space-y-4" aria-hidden="true">
              <Skeleton className="h-12 w-full bg-white/10" />
              <Skeleton className="h-12 w-3/4 bg-white/10" />
              <Skeleton className="h-6 w-2/3 bg-white/10" />
              <Skeleton className="h-14 w-full max-w-xl bg-white/10" />
            </div>
          )}
        </div>
        <div>
          {content?.imageUrl ? (
            <img src={content.imageUrl} alt={content.imageAlt} className="mx-auto w-full max-w-lg rounded-[2rem] object-cover shadow-2xl" />
          ) : (
            <HeroImagePlaceholder alt={content?.imageAlt || 'Students with textbooks'} />
          )}
        </div>
      </div>
    </section>
  );
}
