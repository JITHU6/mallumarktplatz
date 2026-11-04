import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("size-9 shrink-0", className)}>
      <rect width="64" height="64" rx="14" fill="#173E35" />
      <path
        d="M10 22h44l-4 8a5.5 5.5 0 0 1-9 0a5.5 5.5 0 0 1-9 0a5.5 5.5 0 0 1-9 0a5.5 5.5 0 0 1-9 0z"
        fill="#D6AE65"
      />
      <path
        d="M18 50V36l7 8 7-8 7 8 7-8v14"
        fill="none"
        stroke="#F8F7F2"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5 rounded-lg", className)} aria-label="MalluMarktplatz – Home">
      <LogoMark />
      <span className={cn("text-lg font-bold tracking-tight", inverted ? "text-cream" : "text-forest")}>
        Mallu<span className="text-gold-dark">Marktplatz</span>
      </span>
    </Link>
  );
}
