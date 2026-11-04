"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { deleteAccount, type SimpleState } from "@/actions/account";
import { updatePassword, type AuthFormState } from "@/actions/auth";
import { fieldA11y, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

export function ChangePasswordForm() {
  const t = useTranslations("dashboard");
  const ta = useTranslations("auth");
  const [state, action] = useActionState<AuthFormState, FormData>(updatePassword, { status: "idle" });
  const fe = state.fieldErrors ?? {};
  useEffect(() => {
    if (state.status === "success") toast.success(t("passwordUpdated"));
    if (state.status === "error" && state.error) toast.error(ta(`errors.${state.error}` as "errors.generic"));
  }, [state, t, ta]);

  return (
    <form action={action} className="space-y-4">
      <FormField id="password" label={ta("newPassword")} required hint={ta("passwordHint")} error={fe.password}>
        <Input {...fieldA11y("password", fe.password, true)} name="password" type="password" autoComplete="new-password" minLength={8} required />
      </FormField>
      <FormField id="confirmPassword" label={ta("confirmPassword")} required error={fe.confirmPassword}>
        <Input {...fieldA11y("confirmPassword", fe.confirmPassword)} name="confirmPassword" type="password" autoComplete="new-password" required />
      </FormField>
      <SubmitButton>{ta("resetSubmit")}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm() {
  const t = useTranslations("dashboard");
  const [state, action] = useActionState<SimpleState, FormData>(deleteAccount, { status: "idle" });
  const [confirm, setConfirm] = useState("");
  useEffect(() => {
    if (state.status === "error" && !state.fieldErrors) toast.error(t("deleteAccountFailed"));
  }, [state, t]);

  return (
    <form action={action} className="space-y-4">
      <FormField id="confirm" label={t("deleteAccountConfirmLabel")} required error={state.fieldErrors?.confirm}>
        <Input
          {...fieldA11y("confirm", state.fieldErrors?.confirm)}
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="off"
          className="max-w-xs"
        />
      </FormField>
      <SubmitButton variant="destructive" disabled={confirm !== "DELETE"}>
        {t("deleteAccountButton")}
      </SubmitButton>
    </form>
  );
}
