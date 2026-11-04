import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProsePage } from "@/components/prose-page";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/about" } };
}

export default async function AboutPage() {
  const t = await getTranslations("about");
  const th = await getTranslations("home");
  return (
    <ProsePage title={t("title")} intro={t("intro")}>
      <section>
        <h2>{t("missionTitle")}</h2>
        <p>{t("mission")}</p>
      </section>
      <section>
        <h2>{t("howTitle")}</h2>
        <ol className="space-y-1">
          <li>{t("how1")}</li>
          <li>{t("how2")}</li>
          <li>{t("how3")}</li>
        </ol>
      </section>
      <section>
        <h2>{t("verifiedTitle")}</h2>
        <p>{t("verified")}</p>
      </section>
      <Button asChild size="lg" className="no-underline">
        <Link href="/register-business" className="text-cream! no-underline!">
          {th("ctaButton")}
        </Link>
      </Button>
    </ProsePage>
  );
}
