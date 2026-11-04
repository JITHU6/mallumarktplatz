export function ProsePage({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="container-page py-10 sm:py-14">
      <article className="mx-auto max-w-3xl">
        <div className="mb-3 h-1 w-10 rounded-full bg-gold" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-forest sm:text-4xl">{title}</h1>
        {intro && <p className="mt-4 text-lg leading-relaxed text-charcoal/85">{intro}</p>}
        <div className="mt-8 space-y-6 leading-relaxed text-charcoal/90 [&_a]:font-medium [&_a]:text-forest [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-forest [&_li]:ml-5 [&_li]:list-disc [&_ol>li]:list-decimal">
          {children}
        </div>
      </article>
    </div>
  );
}
