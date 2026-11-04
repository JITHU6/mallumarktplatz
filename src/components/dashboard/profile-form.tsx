"use client";

import { useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { updateProfile, type SimpleState } from "@/actions/account";
import { fieldA11y, FormField } from "@/components/forms/form-field";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { localeLabels, locales } from "@/i18n/config";

export function ProfileForm({ fullName, email, locale }: { fullName: string; email: string; locale: string }) {
  const t = useTranslations("dashboard");
  const ta = useTranslations("auth");
  const tc = useTranslations("common");
  const [state, action] = useActionState<SimpleState, FormData>(updateProfile, { status: "idle" });
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") toast.success(t("profileSaved"));
    if (state.status === "error" && !state.fieldErrors) toast.error(ta("errors.generic"));
  }, [state, t, ta]);

  return (
    <form action={action} className="max-w-lg space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <FormField id="fullName" label={ta("fullName")} required error={fe.fullName}>
        <Input {...fieldA11y("fullName", fe.fullName)} name="fullName" defaultValue={fullName} maxLength={120} required autoComplete="name" />
      </FormField>
      <FormField id="email" label={ta("email")} required>
        <Input id="email" value={email} disabled readOnly />
      </FormField>
      <FormField id="preferredLocale" label={t("preferredLanguage")} required error={fe.preferredLocale}>
        <NativeSelect id="preferredLocale" name="preferredLocale" defaultValue={locale}>
          {locales.map((l) => (
            <option key={l} value={l}>
              {localeLabels[l]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <SubmitButton pendingLabel={tc("saving")}>{tc("save")}</SubmitButton>
    </form>
  );
}
