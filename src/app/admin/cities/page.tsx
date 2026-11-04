import { getTranslations } from "next-intl/server";
import { CityForm } from "@/components/admin/taxonomy-forms";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCitiesPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const supabase = await createClient();
  const { data } = await supabase.from("cities").select("*").order("sort_order").order("name");

  return (
    <>
      <PageHeader title={t("citiesTitle")} />
      <h3 className="mb-2 font-semibold text-forest">{t("addCity")}</h3>
      <CityForm />
      <ul className="mt-8 space-y-3">
        {(data ?? []).map((c) => (
          <li key={c.id}>
            <CityForm city={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
