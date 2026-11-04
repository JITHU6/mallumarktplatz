import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** GDPR Art. 15/20: export of the personal data stored for the current user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = await createClient();

  const [businesses, favourites, reports, verifications] = await Promise.all([
    supabase
      .from("businesses")
      .select(
        "*, owner_details:business_owner_details(*), images:business_images(*), hours:business_opening_hours(*), social:business_social_links(*)",
      )
      .eq("owner_id", user.id),
    supabase.from("favourites").select("business_id, created_at").eq("user_id", user.id),
    supabase.from("business_reports").select("business_id, reason, details, created_at").eq("reporter_id", user.id),
    supabase.from("business_verification_requests").select("*").eq("requested_by", user.id),
  ]);

  const body = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email, profile: user.profile },
    businesses: businesses.data ?? [],
    favourites: favourites.data ?? [],
    reports: reports.data ?? [],
    verificationRequests: verifications.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mallumarktplatz-data-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
