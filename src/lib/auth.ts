import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Get the current Supabase user OR redirect to sign-in.
 * Use at the top of any protected Server Component / Server Action.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

/**
 * Get the current user's profile row from our `app.profiles` table.
 * Returns null if the profile hasn't been created yet (new signup).
 */
export async function getCurrentProfile() {
  const user = await getCurrentUser();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  return profile ?? null;
}
