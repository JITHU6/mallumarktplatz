import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { requireUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser("/dashboard/profile");
  const t = await getTranslations("dashboard");
  return (
    <>
      <PageHeader title={t("profileTitle")} />
      <ProfileForm
        fullName={user.profile?.full_name ?? ""}
        email={user.email ?? ""}
        locale={user.profile?.preferred_locale ?? "en"}
      />
    </>
  );
}
