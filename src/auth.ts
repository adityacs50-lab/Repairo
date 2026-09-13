import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Auth.js (NextAuth v5) — Google sign-in for landing-page beta waitlist.
 *
 * Product access (/app) still uses the custom GitHub OAuth session in
 * `src/lib/auth/*`. These two auth systems intentionally do not share cookies.
 *
 * Env (Auth.js convention):
 *   AUTH_SECRET
 *   AUTH_GOOGLE_ID       (or NEXT_PUBLIC_GOOGLE_CLIENT_ID as fallback)
 *   AUTH_GOOGLE_SECRET
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID?.trim() ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ||
        "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET?.trim() || "",
    }),
  ],
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    // Keep users on the marketing site if Google returns an error
    error: "/",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Only allow same-origin redirects after OAuth
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});
