import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation/auth";

/** PKCE flow: exchanges the ?code from Supabase email links for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const target = new URL(next, origin);
      if (next === "/dashboard") target.searchParams.set("welcome", "1");
      return NextResponse.redirect(target);
    }
  }
  return NextResponse.redirect(new URL("/login?error=confirm", origin));
}
