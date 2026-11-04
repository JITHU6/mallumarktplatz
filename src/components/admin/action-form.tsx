"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { AdminResult } from "@/actions/admin";

type Action = (state: AdminResult, formData: FormData) => Promise<AdminResult>;

/**
 * Small wrapper for admin forms: runs a server action, shows a toast with the
 * result and optionally asks for confirmation first. The toast is raised inside
 * the action (not an effect) because the form often unmounts after revalidation.
 */
export function ActionForm({
  action,
  children,
  confirmMessage,
  className,
}: {
  action: Action;
  children: React.ReactNode;
  confirmMessage?: string;
  className?: string;
}) {
  const t = useTranslations("admin");
  const [, formAction] = useActionState<AdminResult, FormData>(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.status === "success") toast.success(result.message ?? t("actionDone"));
    if (result.status === "error")
      toast.error(t("actionFailed", { message: result.message ?? "" }), {
        description: result.reference ? `ref ${result.reference}` : undefined,
      });
    return result;
  }, { status: "idle" });

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}
