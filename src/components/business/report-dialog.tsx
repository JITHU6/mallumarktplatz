"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { submitReport, type ReportState } from "@/actions/public";
import { NativeSelect } from "@/components/forms/native-select";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const REASONS = [
  "incorrect_information",
  "closed_permanently",
  "not_malayali_owned",
  "inappropriate_content",
  "spam",
  "privacy",
  "removal_request",
  "other",
] as const;

export function ReportDialog({ businessId }: { businessId: string }) {
  const t = useTranslations("report");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [, action, pending] = useActionState<ReportState, FormData>(async (prev, formData) => {
    const result = await submitReport(prev, formData);
    if (result.status === "success") {
      toast.success(t("success"));
      setOpen(false);
    } else {
      toast.error(t("error"));
    }
    return result;
  }, { status: "idle" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto px-0 text-muted-foreground">
          <Flag /> {t("title")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="businessId" value={businessId} />
          <div className="hidden" aria-hidden="true">
            <label>
              Website <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-reason">{t("reason")}</Label>
            <NativeSelect id="report-reason" name="reason" required defaultValue="incorrect_information">
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-details">{t("details")}</Label>
            <Textarea id="report-details" name="details" maxLength={2000} rows={4} placeholder={t("detailsPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="report-email">{t("email")}</Label>
            <Input id="report-email" name="email" type="email" maxLength={254} autoComplete="email" />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {t("submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
