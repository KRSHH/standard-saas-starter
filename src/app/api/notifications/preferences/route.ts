import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import {
  NOTIFICATION_CATEGORIES,
  getPreferences,
  updatePreferences,
} from "@/lib/notifications/store";

export const runtime = "nodejs";

const patchSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailCategories: z.array(z.enum(NOTIFICATION_CATEGORIES)).optional(),
});

/** GET /api/notifications/preferences — read the user's preference row. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { limited, headers } = await rateLimit(request, {
    namespace: "notifications-prefs",
    limit: 60,
    window: 60,
  });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers },
    );
  }

  const prefs = await getPreferences(user.id);
  return NextResponse.json(prefs);
}

/** PATCH /api/notifications/preferences — update emailEnabled / categories. */
export async function PATCH(request: NextRequest) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { limited, headers } = await rateLimit(request, {
    namespace: "notifications-prefs",
    limit: 30,
    window: 60,
  });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers },
    );
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const updated = await updatePreferences(user.id, parsed.data);
  return NextResponse.json(updated);
}
