import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeading({
  title,
  subtitle,
  href,
  linkLabel,
  id,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  id?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <div className="h-1 w-10 rounded-full bg-gold" aria-hidden="true" />
        <h2 id={id} className="text-2xl font-bold text-forest sm:text-3xl">
          {title}
        </h2>
        {subtitle && <p className="max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-forest hover:text-gold-dark"
        >
          {linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
