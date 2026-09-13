"use server";

import { signIn, signOut } from "@/auth";

/** Do not put URL hashes (#...) in redirectTo — Google OAuth rejects malformed callback URLs. */
export async function signInWithGoogle() {
  await signIn("google", { redirectTo: "/?signup=success" });
}

export async function signOutGoogle() {
  await signOut({ redirectTo: "/" });
}
