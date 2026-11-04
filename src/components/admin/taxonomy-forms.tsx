import { getTranslations } from "next-intl/server";
import { deleteCategory, deleteCity, saveCategory, saveCity } from "@/actions/admin";
import { CATEGORY_ICONS } from "@/components/business/category-icon";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Category, City } from "@/lib/supabase/database.types";
import { ActionForm } from "./action-form";

function tr(json: unknown, key: string) {
  return json && typeof json === "object" && !Array.isArray(json) ? ((json as Record<string, string>)[key] ?? "") : "";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <Label asChild>
        <span>{label}</span>
      </Label>
      {children}
    </label>
  );
}

export async function CategoryForm({ category, parents }: { category?: Category; parents: Category[] }) {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <ActionForm action={saveCategory} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {category && <input type="hidden" name="id" value={category.id} />}
        <Field label={t("name")}>
          <Input name="name" defaultValue={category?.name} required maxLength={80} />
        </Field>
        <Field label={t("slug")}>
          <Input name="slug" defaultValue={category?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} />
        </Field>
        <Field label={t("nameDe")}>
          <Input name="nameDe" defaultValue={tr(category?.name_translations, "de")} maxLength={80} />
        </Field>
        <Field label={t("nameMl")}>
          <Input name="nameMl" defaultValue={tr(category?.name_translations, "ml")} maxLength={80} lang="ml" />
        </Field>
        <Field label={t("icon")}>
          <NativeSelect name="icon" defaultValue={category?.icon ?? "briefcase"}>
            {Object.keys(CATEGORY_ICONS).map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t("parent")}>
          <NativeSelect name="parentId" defaultValue={category?.parent_id ?? ""}>
            <option value="">{t("noParent")}</option>
            {parents
              .filter((p) => p.id !== category?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </NativeSelect>
        </Field>
        <Field label={t("sortOrder")}>
          <Input name="sortOrder" type="number" min={0} max={10000} defaultValue={category?.sort_order ?? 100} />
        </Field>
        <div className="flex items-end justify-between gap-2">
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input type="checkbox" name="isActive" defaultChecked={category?.is_active ?? true} className="size-4 accent-forest" />
            {t("active")}
          </label>
          <SubmitButton size="sm">{category ? tc("save") : t("addCategory")}</SubmitButton>
        </div>
      </ActionForm>
      {category && (
        <ActionForm action={deleteCategory} confirmMessage={t("deleteConfirm")} className="mt-2 text-right">
          <input type="hidden" name="id" value={category.id} />
          <SubmitButton size="xs" variant="ghost" className="text-destructive">
            {tc("delete")}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

export async function CityForm({ city }: { city?: City }) {
  const t = await getTranslations("admin");
  const tc = await getTranslations("common");
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <ActionForm action={saveCity} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {city && <input type="hidden" name="id" value={city.id} />}
        <Field label={t("name")}>
          <Input name="name" defaultValue={city?.name} required maxLength={80} />
        </Field>
        <Field label={t("slug")}>
          <Input name="slug" defaultValue={city?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={60} />
        </Field>
        <Field label={t("nameDe")}>
          <Input name="nameDe" defaultValue={tr(city?.name_translations, "de")} maxLength={80} />
        </Field>
        <Field label={t("nameMl")}>
          <Input name="nameMl" defaultValue={tr(city?.name_translations, "ml")} maxLength={80} lang="ml" />
        </Field>
        <Field label={t("state")}>
          <Input name="state" defaultValue={city?.state ?? ""} maxLength={60} />
        </Field>
        <Field label={t("aliases")}>
          <Input name="aliases" defaultValue={city?.aliases.join(", ")} maxLength={500} />
        </Field>
        <Field label={t("latitude")}>
          <Input name="latitude" type="number" step="any" defaultValue={city?.latitude ?? ""} />
        </Field>
        <Field label={t("longitude")}>
          <Input name="longitude" type="number" step="any" defaultValue={city?.longitude ?? ""} />
        </Field>
        <Field label={t("sortOrder")}>
          <Input name="sortOrder" type="number" min={0} max={10000} defaultValue={city?.sort_order ?? 100} />
        </Field>
        <div className="flex flex-wrap items-end gap-4 pb-2 text-sm lg:col-span-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isFeatured" defaultChecked={city?.is_featured ?? true} className="size-4 accent-forest" />
            {t("featuredCity")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="isActive" defaultChecked={city?.is_active ?? true} className="size-4 accent-forest" />
            {t("active")}
          </label>
        </div>
        <div className="flex items-end justify-end">
          <SubmitButton size="sm">{city ? tc("save") : t("addCity")}</SubmitButton>
        </div>
      </ActionForm>
      {city && (
        <ActionForm action={deleteCity} confirmMessage={t("deleteConfirm")} className="mt-2 text-right">
          <input type="hidden" name="id" value={city.id} />
          <SubmitButton size="xs" variant="ghost" className="text-destructive">
            {tc("delete")}
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
