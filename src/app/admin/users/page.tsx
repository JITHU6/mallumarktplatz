import { getFormatter, getTranslations } from "next-intl/server";
import { setUserRole } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { NativeSelect } from "@/components/forms/native-select";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { searchTerms } from "@/lib/directory-params";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

const PAGE = 50;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [t, format] = await Promise.all([getTranslations("admin"), getFormatter()]);
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  for (const term of searchTerms(sp.q ?? "")) query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  const { data, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const roles = ["user", "business_owner", "admin"] as const;

  return (
    <>
      <PageHeader title={t("usersTitle")} description={`${count ?? 0}`} />
      <form className="mb-4 flex max-w-md gap-2" action="/admin/users">
        <Input name="q" defaultValue={sp.q} placeholder={t("usersSearchPlaceholder")} aria-label={t("searchButton")} className="bg-white" />
        <Button type="submit" variant="outline">
          {t("searchButton")}
        </Button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead>{t("colEmail")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("colJoined")}</TableHead>
              <TableHead>{t("colRole")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.full_name ?? "—"}</TableCell>
                <TableCell className="max-w-[220px] truncate">{u.email}</TableCell>
                <TableCell className="hidden md:table-cell">{format.dateTime(new Date(u.created_at), { dateStyle: "medium" })}</TableCell>
                <TableCell>
                  {u.id === me.id ? (
                    t(`roles.${u.role}`)
                  ) : (
                    <ActionForm action={setUserRole} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      <NativeSelect name="role" defaultValue={u.role} aria-label={t("changeRole")} className="h-8 w-44">
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </NativeSelect>
                      <SubmitButton size="sm" variant="outline">
                        {t("changeRole")}
                      </SubmitButton>
                    </ActionForm>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2 text-sm">
          {page > 1 && <Link href={`/admin/users?page=${page - 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>←</Link>}
          <span>
            {page} / {totalPages}
          </span>
          {page < totalPages && <Link href={`/admin/users?page=${page + 1}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>→</Link>}
        </div>
      )}
    </>
  );
}
