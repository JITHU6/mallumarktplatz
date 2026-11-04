import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CategoryGrid } from "@/components/home/category-grid";
import { SetupNotice } from "@/components/setup-notice";
import { getCategories } from "@/lib/data/taxonomy";
import { env } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("categoriesPage");
  return { title: t("metaTitle"), description: t("metaDescription"), alternates: { canonical: "/categories" } };
}

export default async function CategoriesPage() {
  if (!env.supabaseUrl) return <SetupNotice />;
  const t = await getTranslations("categoriesPage");
  const categories = await getCategories();
  return (
    <div className="container-page py-10 sm:py-14">
      <div className="mb-8 space-y-2">
        <div className="h-1 w-10 rounded-full bg-gold" aria-hidden="true" />
        <h1 className="text-3xl font-bold text-forest sm:text-4xl">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <CategoryGrid categories={categories.filter((c) => !c.parent_id)} />
    </div>
  );
}
