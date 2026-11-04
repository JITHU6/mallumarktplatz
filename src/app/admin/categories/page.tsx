import { getTranslations } from "next-intl/server";
import { CategoryForm } from "@/components/admin/taxonomy-forms";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("business_categories").select("*").order("sort_order").order("name");
  const categories = data ?? [];
  const parents = categories.filter((c) => !c.parent_id);

  return (
    <>
      <PageHeader title={t("categoriesTitle")} />
      <h3 className="mb-2 font-semibold text-forest">{t("addCategory")}</h3>
      <CategoryForm parents={parents} />
      <ul className="mt-8 space-y-3">
        {categories.map((c) => (
          <li key={c.id}>
            <CategoryForm category={c} parents={parents} />
          </li>
        ))}
      </ul>
    </>
  );
}
