import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail } from "lucide-react";
import { ProsePage } from "@/components/prose-page";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("contact");
  return { title: t("metaTitle"), alternates: { canonical: "/contact" } };
}

export default async function ContactPage() {
  const t = await getTranslations("contact");
  return (
    <ProsePage title={t("title")} intro={t("intro")}>
      <p className="flex items-center gap-2">
        <Mail className="size-5 text-gold-dark" aria-hidden="true" />
        {t("email")} <a href={`mailto:${siteConfig.contactEmail}`}>{siteConfig.contactEmail}</a>
      </p>
      <p className="text-sm text-muted-foreground">{t("listingIssues")}</p>
    </ProsePage>
  );
}
