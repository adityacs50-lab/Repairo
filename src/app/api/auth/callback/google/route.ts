import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const siteUrl = process.env.APP_URL || request.nextUrl.origin;

  if (code && googleClientId && googleClientSecret) {
    try {
      const redirectUri = `${siteUrl}/api/auth/callback/google`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (tokens.access_token) {
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const googleUser = await userRes.json();

        // Register beta signup email
        if (googleUser.email) {
          try {
            await fetch("https://formsubmit.co/ajax/info@heyrepairo.in", {
              method: "POST",
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: JSON.stringify({
                email: googleUser.email,
                name: googleUser.name || "Google User",
                provider: "google",
                _subject: "Repairo Beta Signup (Google)",
              }),
            });
          } catch {
            // Ignore background mail errors
          }
        }
      }
    } catch (err) {
      console.error("Google OAuth error:", err);
    }
  }

  return NextResponse.redirect(`${siteUrl}/?signup=success&provider=google#hero`);
}
