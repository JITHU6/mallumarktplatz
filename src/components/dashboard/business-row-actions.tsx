"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { BadgeCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteOwnBusiness, requestVerification } from "@/actions/business";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/forms/submit-button";

export function RequestVerificationButton({ businessId }: { businessId: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const [open, setOpen] = useState(false);
  type State = { status: "idle" | "success" | "error" };
  const [, action] = useActionState<State, FormData>(
    async (prev, formData) => {
      const result = await requestVerification(prev, formData);
      if (result.status === "success") {
        toast.success(t("verificationSent"));
        setOpen(false);
      } else toast.error(ta("errors.generic"));
      return result;
    },
    { status: "idle" },
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BadgeCheck /> {t("requestVerification")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("requestVerification")}</DialogTitle>
          <DialogDescription>{t("verificationHint")}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="businessId" value={businessId} />
          <div className="space-y-2">
            <Label htmlFor={`vmsg-${businessId}`}>{t("verificationMessage")}</Label>
            <Textarea id={`vmsg-${businessId}`} name="message" rows={4} maxLength={2000} placeholder={t("verificationMessagePlaceholder")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <SubmitButton>{t("requestVerification")}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteBusinessButton({ businessId }: { businessId: string }) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
          <Trash2 /> {tc("delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteListing")}</DialogTitle>
          <DialogDescription>{t("deleteListingConfirm")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tc("cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteOwnBusiness(businessId);
                if (result.ok) {
                  toast.success(t("listingDeleted"));
                  setOpen(false);
                  router.refresh();
                } else toast.error(ta("errors.generic"));
              })
            }
          >
            <Trash2 /> {t("deleteListing")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
