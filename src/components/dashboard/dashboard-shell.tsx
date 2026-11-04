import type { LucideIcon } from "lucide-react";
import { SideNav, type NavItem } from "./dashboard-nav";

export function DashboardShell({
  title,
  nav,
  navLabel,
  children,
}: {
  title: string;
  nav: NavItem[];
  navLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="sr-only">{title}</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="mb-3 hidden text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:block">{title}</p>
          <SideNav items={nav} label={navLabel} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-forest sm:text-3xl">{title}</h2>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="size-5 text-gold-dark" aria-hidden="true" />
      </div>
      <p className="mt-2 text-3xl font-bold text-forest tabular-nums">{value}</p>
    </div>
  );
}
