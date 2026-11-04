import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, ClipboardList, ShieldCheck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("registerBusiness");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/register-business" } };
}

export default async function RegisterBusinessPage() {
  if (await getCurrentUser()) redirect("/dashboard/businesses/new");
  const t = await getTranslations("registerBusiness");
  const tn = await getTranslations("nav");
  const steps = [
    { Icon: UserPlus, text: t("step1") },
    { Icon: ClipboardList, text: t("step2") },
    { Icon: ShieldCheck, text: t("step3") },
  ];
  const next = encodeURIComponent("/dashboard/businesses/new");

  return (
    <div className="container-page py-12 sm:py-16">
      <div className="mx-auto max-w-3xl text-center">
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-gold" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-forest sm:text-4xl">{t("title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ol className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
        {steps.map(({ Icon, text }, i) => (
          <li key={text} className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-secondary text-forest">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <p className="text-xs font-semibold tracking-wider text-gold-dark uppercase">{i + 1}</p>
            <p className="mt-1 font-medium text-charcoal">{text}</p>
          </li>
        ))}
      </ol>
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-gold/50 bg-accent/60 p-6 text-center">
        <p className="flex items-start justify-center gap-2 text-charcoal">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-forest" aria-hidden="true" />
          {t("loginRequired")}
        </p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="h-11">
            <Link href={`/register?next=${next}`}>{tn("register")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <Link href={`/login?next=${next}`}>{tn("login")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
