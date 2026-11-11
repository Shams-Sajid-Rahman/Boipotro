import Button from '../ui/Button.jsx';
import SearchBar from '../ui/SearchBar.jsx';
import { Skeleton } from '../ui/Loader.jsx';

/**
 * Full-bleed campus photo with a navy fade from the left (per the design).
 * The photo URL comes from site_content.hero.imageUrl; if the file is missing the
 * navy background colour shows instead. -mt-16 pulls the hero under the
 * transparent navbar so the photo runs behind it.
 */
export default function Hero({ content }) {
  const image = content?.imageUrl;
  return (
    <section className="relative -mt-16 overflow-hidden bg-navy-900 pt-16 text-white">
      {/* Phones: photo behind the text. Desktop: photo fills the right ~60%, like the design. */}
      {image && (
        <img
          src={image}
          alt={content.imageAlt}
          className="absolute inset-y-0 right-0 h-full w-full object-cover object-[60%_center] md:w-[62%] md:object-center"
        />
      )}
      {/* Phones: dark overlay for legible text. Desktop: navy fades out across the photo's left edge. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-navy-900/80 md:bg-transparent md:bg-gradient-to-r md:from-navy-900 md:from-[38%] md:via-navy-900/60 md:via-[50%] md:to-transparent md:to-[62%]"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
        <div className="max-w-xl">
          {content ? (
            <>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                {content.headline} <span className="text-brand-orange">{content.highlight}</span>
              </h1>
              <p className="mt-4 text-base text-slate-200 sm:text-lg">{content.description}</p>
              <div className="mt-6">
                <SearchBar size="lg" variant="icon" placeholder={content.searchPlaceholder} />
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
              <Skeleton className="h-14 w-full bg-white/10" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
