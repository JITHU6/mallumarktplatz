"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { saveBusiness, type BusinessFormState, type BusinessFormValues } from "@/actions/business";
import { BUNDESLAENDER } from "@/config/site";
import { MAX_GALLERY_IMAGES } from "@/lib/storage";
import { SOCIAL_PLATFORMS } from "@/lib/validation/business";
import { socialIcons, socialLabels } from "@/components/icons/social-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fieldA11y, FormField } from "./form-field";
import { HoursEditor } from "./hours-editor";
import { GalleryUpload, SingleImageUpload } from "./image-upload";
import { NativeSelect } from "./native-select";
import { SubmitButton } from "./submit-button";

export type CategoryOption = { id: string; name: string; parentId: string | null };

type Props = {
  mode: "create" | "edit";
  businessId?: string;
  status?: "pending" | "approved" | "rejected" | "suspended";
  isAdmin?: boolean;
  userId: string;
  categories: CategoryOption[];
  cityNames: string[];
  defaultValues: BusinessFormValues;
  notices?: React.ReactNode;
};

export function BusinessForm(props: Props) {
  const [state, action] = useActionState<BusinessFormState, FormData>(saveBusiness, { status: "idle" });
  const t = useTranslations("form");

  useEffect(() => {
    if (state.status === "success" && state.message) toast.success(t(state.message as "updateSuccess"));
    if (state.status === "error" && state.message) toast.error(t(state.message as "errorGeneric"));
  }, [state, t]);

  // React resets uncontrolled forms after an action. Re-mount with the submitted
  // values so users never lose their input on validation errors.
  const values = state.values ?? props.defaultValues;
  return (
    <form action={action} noValidate className="space-y-6">
      <BusinessFormFields key={state.submissionId ?? 0} {...props} values={values} state={state} />
    </form>
  );
}

function Card({ title, children, description }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <legend className="sr-only">{title}</legend>
      <h2 className="mb-1 text-lg font-semibold text-forest" aria-hidden="true">
        {title}
      </h2>
      {description && <p className="mb-4 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4 space-y-5">{children}</div>
    </fieldset>
  );
}

function BusinessFormFields({
  mode,
  businessId,
  status,
  isAdmin,
  userId,
  categories,
  cityNames,
  values,
  state,
  notices,
}: Props & { values: BusinessFormValues; state: BusinessFormState }) {
  const t = useTranslations("form");
  const tc = useTranslations("common");
  const fe = state.fieldErrors ?? {};
  const [categoryId, setCategoryId] = useState(values.categoryId ?? "");
  const topLevel = categories.filter((c) => !c.parentId);
  const subcategories = useMemo(() => categories.filter((c) => c.parentId === categoryId), [categories, categoryId]);
  const v = (key: keyof BusinessFormValues) => (typeof values[key] === "string" ? (values[key] as string) : "");
  const checked = (key: keyof BusinessFormValues) => values[key] === "on" || values[key] === "true";

  const submitLabel =
    mode === "create" ? t("submitCreate") : status === "rejected" && !isAdmin ? t("resubmit") : t("submitUpdate");

  return (
    <>
      {businessId && <input type="hidden" name="businessId" value={businessId} />}
      {notices}
      {state.status === "error" && state.message && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>
            {t(state.message as "errorGeneric")}
            {state.reference && state.message !== "errorValidation" && (
              <span className="mt-1 block font-mono text-xs opacity-80">{tc("errorReference", { reference: state.reference })}</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {state.status === "success" && state.message && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900" role="status">
          <CircleCheck />
          <AlertDescription className="text-emerald-900">{t(state.message as "updateSuccess")}</AlertDescription>
        </Alert>
      )}
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Info className="size-4 shrink-0" aria-hidden="true" /> {t("requiredHint")}
      </p>

      <Card title={t("sectionBasics")}>
        <FormField id="name" label={t("name")} required error={fe.name}>
          <Input {...fieldA11y("name", fe.name)} name="name" defaultValue={v("name")} required maxLength={120} autoComplete="organization" className="bg-white" />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="categoryId" label={t("category")} required error={fe.categoryId}>
            <NativeSelect
              {...fieldA11y("categoryId", fe.categoryId)}
              name="categoryId"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="" disabled>
                {t("selectCategory")}
              </option>
              {topLevel.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          {subcategories.length > 0 && (
            <FormField id="subcategoryId" label={t("subcategory")} error={fe.subcategoryId}>
              <NativeSelect {...fieldA11y("subcategoryId", fe.subcategoryId)} name="subcategoryId" defaultValue={v("subcategoryId")}>
                <option value="">{t("noSubcategory")}</option>
                {subcategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          )}
        </div>
        <FormField id="shortDescription" label={t("shortDescription")} required hint={t("shortDescriptionHint")} error={fe.shortDescription}>
          <Textarea
            {...fieldA11y("shortDescription", fe.shortDescription, true)}
            name="shortDescription"
            defaultValue={v("shortDescription")}
            rows={2}
            maxLength={200}
            required
            className="bg-white"
          />
        </FormField>
        <FormField id="description" label={t("description")} hint={t("descriptionHint")} error={fe.description}>
          <Textarea {...fieldA11y("description", fe.description, true)} name="description" defaultValue={v("description")} rows={6} maxLength={5000} className="bg-white" />
        </FormField>
        <FormField id="services" label={t("services")} hint={t("servicesHint")} error={fe.services}>
          <Input {...fieldA11y("services", fe.services, true)} name="services" defaultValue={v("services")} maxLength={1300} className="bg-white" />
        </FormField>
      </Card>

      <Card title={t("sectionContact")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField id="email" label={t("email")} required error={fe.email}>
            <Input {...fieldA11y("email", fe.email)} name="email" type="email" defaultValue={v("email")} required maxLength={254} autoComplete="email" className="bg-white" />
          </FormField>
          <FormField id="phone" label={t("phone")} error={fe.phone}>
            <Input {...fieldA11y("phone", fe.phone)} name="phone" type="tel" defaultValue={v("phone")} maxLength={40} autoComplete="tel" className="bg-white" />
          </FormField>
          <FormField id="whatsapp" label={t("whatsapp")} hint={t("whatsappHint")} error={fe.whatsapp}>
            <Input {...fieldA11y("whatsapp", fe.whatsapp, true)} name="whatsapp" type="tel" defaultValue={v("whatsapp")} maxLength={40} className="bg-white" />
          </FormField>
          <FormField id="website" label={t("website")} error={fe.website}>
            <Input {...fieldA11y("website", fe.website)} name="website" type="url" inputMode="url" defaultValue={v("website")} maxLength={300} placeholder="https://" className="bg-white" />
          </FormField>
        </div>
      </Card>

      <Card title={t("sectionLocation")}>
        <FormField id="addressLine" label={t("addressLine")} error={fe.addressLine}>
          <Input {...fieldA11y("addressLine", fe.addressLine)} name="addressLine" defaultValue={v("addressLine")} maxLength={200} autoComplete="street-address" className="bg-white" />
        </FormField>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="hideStreetAddress" defaultChecked={checked("hideStreetAddress")} className="mt-0.5 size-4 accent-forest" />
          {t("hideStreetAddress")}
        </label>
        <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
          <FormField id="postalCode" label={t("postalCode")} required error={fe.postalCode}>
            <Input
              {...fieldA11y("postalCode", fe.postalCode)}
              name="postalCode"
              defaultValue={v("postalCode")}
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              required
              autoComplete="postal-code"
              className="bg-white"
            />
          </FormField>
          <FormField id="city" label={t("city")} required error={fe.city}>
            <Input {...fieldA11y("city", fe.city)} name="city" list="city-suggestions" defaultValue={v("city")} required maxLength={100} autoComplete="address-level2" className="bg-white" />
            <datalist id="city-suggestions">
              {cityNames.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </FormField>
        </div>
        <FormField id="bundesland" label={t("bundesland")} error={fe.bundesland}>
          <NativeSelect {...fieldA11y("bundesland", fe.bundesland)} name="bundesland" defaultValue={v("bundesland")}>
            <option value="">{t("selectState")}</option>
            {BUNDESLAENDER.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </FormField>
      </Card>

      <Card title={t("sectionMedia")}>
        <div className="grid gap-6 md:grid-cols-[auto_1fr]">
          <SingleImageUpload name="logoPath" label={t("logo")} userId={userId} defaultPath={v("logoPath")} error={fe.logoPath} />
          <SingleImageUpload name="coverPath" label={t("cover")} userId={userId} defaultPath={v("coverPath")} aspect="wide" error={fe.coverPath} />
        </div>
        <div className="space-y-2">
          <span className="text-sm font-medium text-charcoal">{t("gallery")}</span>
          <p className="text-xs text-muted-foreground">{t("galleryHint", { max: MAX_GALLERY_IMAGES })}</p>
          <GalleryUpload userId={userId} defaultPaths={values.galleryPaths ?? []} max={MAX_GALLERY_IMAGES} error={fe.galleryPaths} />
        </div>
      </Card>

      <Card title={t("sectionHours")}>
        <HoursEditor defaultHours={values.hours} errors={fe} />
      </Card>

      <Card title={t("sectionSocial")}>
        <div className="grid gap-5 sm:grid-cols-2">
          {SOCIAL_PLATFORMS.map((p) => {
            const Icon = socialIcons[p];
            const id = `social-${p}`;
            const error = fe[`social.${p}`];
            return (
              <FormField
                key={p}
                id={id}
                label={
                  <span className="inline-flex items-center gap-1.5">
                    <Icon className="size-4" /> {socialLabels[p]}
                  </span>
                }
                error={error}
              >
                <Input
                  {...fieldA11y(id, error)}
                  name={`social.${p}`}
                  type="url"
                  inputMode="url"
                  defaultValue={values.social?.[p] ?? ""}
                  placeholder="https://"
                  maxLength={300}
                  className="bg-white"
                />
              </FormField>
            );
          })}
        </div>
      </Card>

      <Card title={t("sectionOwner")}>
        <FormField id="ownerName" label={t("ownerName")} required hint={t("ownerNameHint")} error={fe.ownerName}>
          <Input {...fieldA11y("ownerName", fe.ownerName, true)} name="ownerName" defaultValue={v("ownerName")} required maxLength={120} autoComplete="name" className="bg-white" />
        </FormField>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="showOwnerName" defaultChecked={checked("showOwnerName")} className="mt-0.5 size-4 accent-forest" />
          {t("showOwnerName")}
        </label>
      </Card>

      {mode === "create" && (
        <div className="space-y-1 rounded-2xl border border-gold/50 bg-accent/60 p-5">
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              name="consent"
              required
              defaultChecked={checked("consent")}
              aria-invalid={fe.consent ? true : undefined}
              className="mt-1 size-4 shrink-0 accent-forest"
            />
            <span>
              {t("consent")} <span className="text-destructive">*</span>
            </span>
          </label>
          {fe.consent && <ConsentError />}
        </div>
      )}

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-border bg-cream/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <SubmitButton size="lg" className="h-12 w-full text-base sm:w-auto sm:px-8" pendingLabel={t("submitting")}>
          {submitLabel}
        </SubmitButton>
      </div>
    </>
  );
}

function ConsentError() {
  const t = useTranslations("validation");
  return (
    <p className="text-xs font-medium text-destructive" role="alert">
      {t("consentRequired")}
    </p>
  );
}
