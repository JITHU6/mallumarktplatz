import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { ExternalLink, Pencil } from "lucide-react";
import { z } from "zod";
import { addManager, deleteBusinessAsAdmin, moderateBusiness, removeManager } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { StatusBadge } from "@/components/business/badges";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { REVIEWED_COLUMNS } from "@/lib/business-columns";
import { getBusinessForEdit } from "@/lib/data/businesses";
import { mediaUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

function display(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  await requireAdmin();
  const business = await getBusinessForEdit(id);
  if (!business) notFound();

  const [t, format] = await Promise.all([getTranslations("admin"), getFormatter()]);
  const supabase = await createClient();
  const [{ data: owner }, { data: managers }, { data: verifications }, { data: reports }] = await Promise.all([
    business.owner_id
      ? supabase.from("profiles").select("email, full_name").eq("id", business.owner_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("business_managers").select("user_id, profile:profiles(email, full_name)").eq("business_id", id),
    supabase.from("business_verification_requests").select("*").eq("business_id", id).order("created_at", { ascending: false }),
    supabase.from("business_reports").select("id, reason, status, created_at").eq("business_id", id).order("created_at", { ascending: false }),
  ]);

  const pending = (business.pending_changes ?? null) as Record<string, unknown> | null;
  const current = business as unknown as Record<string, unknown>;
  const status = business.status;

  const moderation = (intent: string, label: string, variant: "default" | "outline" | "destructive" = "outline", confirm?: string) => (
    <ActionForm action={moderateBusiness} confirmMessage={confirm}>
      <input type="hidden" name="businessId" value={business.id} />
      <input type="hidden" name="intent" value={intent} />
      <SubmitButton variant={variant} size="sm">
        {label}
      </SubmitButton>
    </ActionForm>
  );

  const facts: [string, React.ReactNode][] = [
    ["Slug", business.slug],
    [t("colCategory"), `${business.category?.name ?? "—"}${business.subcategory ? ` / ${business.subcategory.name}` : ""}`],
    ["Email", display(business.email)],
    ["Phone", display(business.phone)],
    ["WhatsApp", display(business.whatsapp)],
    ["Website", display(business.website)],
    ["Address", `${business.address_line ?? ""} ${business.postal_code} ${business.city} ${business.bundesland ?? ""}`.trim()],
    [t("coordinates"), business.latitude != null ? `${business.latitude.toFixed(5)}, ${business.longitude?.toFixed(5)}` : "—"],
    ["Services", business.services.join(", ") || "—"],
    [t("colSubmitted"), format.dateTime(new Date(business.created_at), { dateStyle: "medium", timeStyle: "short" })],
  ];

  return (
    <>
      <PageHeader
        title={business.name}
        description={business.short_description}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/business/${business.slug}`} target="_blank">
                <ExternalLink /> {t("viewPublic")}
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/dashboard/businesses/${business.id}/edit`}>
                <Pencil /> {t("editListing")}
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />
              {business.is_verified && <span className="text-sm font-medium text-forest">✓ verified</span>}
              {business.is_featured && <span className="text-sm font-medium text-gold-dark">★ featured</span>}
              {business.is_demo && <span className="text-sm text-muted-foreground">demo</span>}
            </div>
            {business.rejection_reason && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">{business.rejection_reason}</p>
            )}
            <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              {facts.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{k}</dt>
                  <dd className="break-words">{v}</dd>
                </div>
              ))}
            </dl>
            {business.description && <p className="mt-4 text-sm whitespace-pre-line text-charcoal/90">{business.description}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              {[business.logo_path, business.cover_image_path, ...business.images.map((i) => i.storage_path)]
                .filter(Boolean)
                .map((p) => (
                  <a key={p} href={mediaUrl(p)!} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(p)!} alt="" className="size-20 rounded-lg border border-border object-cover" />
                  </a>
                ))}
            </div>
          </section>

          {pending && Object.keys(pending).length > 0 && (
            <section className="rounded-2xl border border-amber-300 bg-amber-50/60 p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-amber-900">{t("pendingChangesTitle")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase">
                      <th className="py-1 pr-4">{t("field")}</th>
                      <th className="py-1 pr-4">{t("current")}</th>
                      <th className="py-1">{t("proposed")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {REVIEWED_COLUMNS.filter((c) => c in pending).map((c) => (
                      <tr key={c} className="border-t border-amber-200 align-top">
                        <td className="py-2 pr-4 font-mono text-xs">{c}</td>
                        <td className="py-2 pr-4 break-words text-muted-foreground">{display(current[c])}</td>
                        <td className="py-2 break-words font-medium">{display(pending[c])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {moderation("applyChanges", t("applyChanges"), "default")}
                {moderation("discardChanges", t("discardChanges"))}
              </div>
            </section>
          )}

          {(verifications ?? []).length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-forest">{t("verificationsTitle")}</h3>
              <ul className="space-y-2 text-sm">
                {(verifications ?? []).map((v) => (
                  <li key={v.id} className="rounded-lg bg-muted/60 p-3">
                    <span className="font-medium">{v.status}</span> ·{" "}
                    {format.dateTime(new Date(v.created_at), { dateStyle: "medium" })}
                    {v.message && <p className="mt-1 whitespace-pre-line">{v.message}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(reports ?? []).length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-forest">{t("reportsTitle")}</h3>
              <ul className="space-y-1 text-sm">
                {(reports ?? []).map((r) => (
                  <li key={r.id}>
                    <Link href="/admin/reports" className="hover:underline">
                      {r.reason} · {r.status} · {format.dateTime(new Date(r.created_at), { dateStyle: "medium" })}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h3 className="font-semibold text-forest">{t("colActions")}</h3>
            <div className="flex flex-wrap gap-2">
              {(status === "pending" || status === "rejected") && moderation("approve", t("approve"), "default")}
              {status === "suspended" && moderation("reinstate", t("unsuspend"), "default")}
              {status === "approved" && moderation("suspend", t("suspend"))}
              {status === "approved" && (business.is_featured ? moderation("unfeature", t("unfeature")) : moderation("feature", t("feature")))}
              {business.is_verified ? moderation("unverify", t("unverify")) : moderation("verify", t("verify"), "outline", t("verifyHint"))}
              {moderation("geocode", t("geocode"))}
            </div>
            <p className="text-xs text-muted-foreground">{t("verifyHint")}</p>
            {status !== "rejected" && (
              <ActionForm action={moderateBusiness} className="space-y-2 border-t border-border pt-3">
                <input type="hidden" name="businessId" value={business.id} />
                <input type="hidden" name="intent" value="reject" />
                <Label htmlFor="reason">{t("rejectReason")}</Label>
                <Textarea id="reason" name="reason" rows={3} maxLength={1000} required />
                <SubmitButton variant="destructive" size="sm">
                  {t("reject")}
                </SubmitButton>
              </ActionForm>
            )}
            <ActionForm action={deleteBusinessAsAdmin} confirmMessage={t("deleteConfirm")} className="border-t border-border pt-3">
              <input type="hidden" name="businessId" value={business.id} />
              <SubmitButton variant="destructive" size="sm">
                {t("deleteBusiness")}
              </SubmitButton>
            </ActionForm>
          </section>

          <section className="rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">
            <h3 className="mb-3 font-semibold text-forest">{t("ownerDetails")}</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-xs text-muted-foreground">Account</dt>
                <dd>{owner ? `${owner.full_name ?? "—"} (${owner.email ?? "—"})` : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Owner name</dt>
                <dd>{business.owner_details?.owner_name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Public owner name</dt>
                <dd>{display(business.owner_display_name)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Contact</dt>
                <dd>
                  {display(business.owner_details?.contact_email)} {business.owner_details?.contact_phone ?? ""}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-3 rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">
            <h3 className="font-semibold text-forest">{t("managers")}</h3>
            <ul className="space-y-2">
              {(managers ?? []).map((m) => (
                <li key={m.user_id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{m.profile?.email ?? m.user_id}</span>
                  <ActionForm action={removeManager}>
                    <input type="hidden" name="businessId" value={business.id} />
                    <input type="hidden" name="userId" value={m.user_id} />
                    <SubmitButton variant="ghost" size="xs">
                      {t("removeManager")}
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm action={addManager} className="flex gap-2">
              <input type="hidden" name="businessId" value={business.id} />
              <Input name="email" type="email" placeholder={t("addManager")} aria-label={t("addManager")} required className="bg-white" />
              <SubmitButton size="sm" variant="outline">
                +
              </SubmitButton>
            </ActionForm>
          </section>
        </aside>
      </div>
    </>
  );
}
