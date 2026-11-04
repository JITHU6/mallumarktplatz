"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { CircleCheck, MailCheck } from "lucide-react";
import {
  login,
  register,
  requestPasswordReset,
  updatePassword,
  type AuthFormState,
} from "@/actions/auth";
import { fieldA11y, FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial: AuthFormState = { status: "idle" };

function FormError({ state }: { state: AuthFormState }) {
  const t = useTranslations("auth.errors");
  const tc = useTranslations("common");
  if (state.status !== "error" || !state.error) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertDescription>
        {t(state.error as never)}
        {state.reference && state.error === "generic" && (
          <span className="mt-1 block font-mono text-xs opacity-80">{tc("errorReference", { reference: state.reference })}</span>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function LoginForm({ next, notice }: { next: string; notice?: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(login, initial);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {notice && (
        <Alert variant="destructive">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      )}
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <FormField id="email" label={t("email")} required error={fe.email}>
        <Input {...fieldA11y("email", fe.email)} name="email" type="email" autoComplete="email" required defaultValue={state.email} />
      </FormField>
      <FormField id="password" label={t("password")} required error={fe.password}>
        <Input {...fieldA11y("password", fe.password)} name="password" type="password" autoComplete="current-password" required />
      </FormField>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-forest hover:underline">
          {t("forgotPassword")}
        </Link>
      </div>
      <SubmitButton className="h-11 w-full">{t("loginSubmit")}</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-forest hover:underline">
          {t("createAccount")}
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const t = useTranslations("auth");
  const [state, action] = useActionState(register, initial);
  const fe = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <Alert>
        <MailCheck />
        <AlertTitle>{t("checkEmailTitle")}</AlertTitle>
        <AlertDescription>{t("checkEmailDescription", { email: state.email ?? "" })}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <input type="hidden" name="next" value={next} />
      <FormField id="fullName" label={t("fullName")} required error={fe.fullName}>
        <Input {...fieldA11y("fullName", fe.fullName)} name="fullName" autoComplete="name" required maxLength={120} />
      </FormField>
      <FormField id="email" label={t("email")} required error={fe.email}>
        <Input {...fieldA11y("email", fe.email)} name="email" type="email" autoComplete="email" required />
      </FormField>
      <FormField id="password" label={t("password")} required hint={t("passwordHint")} error={fe.password}>
        <Input
          {...fieldA11y("password", fe.password, true)}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </FormField>
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="acceptTerms"
            required
            className="mt-0.5 size-4 shrink-0 accent-forest"
            aria-invalid={fe.acceptTerms ? true : undefined}
          />
          <span>
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link href="/terms" target="_blank" className="font-medium text-forest underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" target="_blank" className="font-medium text-forest underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
        {fe.acceptTerms && <TermsError />}
      </div>
      <SubmitButton className="h-11 w-full">{t("registerSubmit")}</SubmitButton>
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-forest hover:underline">
          {t("loginSubmit")}
        </Link>
      </p>
    </form>
  );
}

function TermsError() {
  const t = useTranslations("validation");
  return (
    <p className="text-xs font-medium text-destructive" role="alert">
      {t("termsRequired")}
    </p>
  );
}

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [state, action] = useActionState(requestPasswordReset, initial);
  const fe = state.fieldErrors ?? {};
  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <Alert>
          <MailCheck />
          <AlertDescription>{t("forgotSent")}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <FormField id="email" label={t("email")} required error={fe.email}>
        <Input {...fieldA11y("email", fe.email)} name="email" type="email" autoComplete="email" required />
      </FormField>
      <SubmitButton className="h-11 w-full">{t("forgotSubmit")}</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/login" className="font-medium text-forest hover:underline">
          {t("backToLogin")}
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tn = useTranslations("nav");
  const [state, action] = useActionState(updatePassword, initial);
  const fe = state.fieldErrors ?? {};
  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <Alert>
          <CircleCheck />
          <AlertDescription>{t("resetSuccess")}</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/dashboard">{tn("dashboard")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormError state={state} />
      <FormField id="password" label={t("newPassword")} required hint={t("passwordHint")} error={fe.password}>
        <Input {...fieldA11y("password", fe.password, true)} name="password" type="password" autoComplete="new-password" minLength={8} required />
      </FormField>
      <FormField id="confirmPassword" label={t("confirmPassword")} required error={fe.confirmPassword}>
        <Input
          {...fieldA11y("confirmPassword", fe.confirmPassword)}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </FormField>
      <SubmitButton className="h-11 w-full">{t("resetSubmit")}</SubmitButton>
    </form>
  );
}
