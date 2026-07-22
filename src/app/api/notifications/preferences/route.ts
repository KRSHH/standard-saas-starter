import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth";
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
  return withAuth(
    request,
    { namespace: "notifications-prefs", limit: 60, window: 60 },
    async (user) => NextResponse.json(await getPreferences(user.id)),
  );
}

/** PATCH /api/notifications/preferences — update emailEnabled / categories. */
export async function PATCH(request: NextRequest) {
  return withAuth(
    request,
    { namespace: "notifications-prefs", limit: 30, window: 60 },
    async (user) => {
      const parsed = patchSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid payload", issues: parsed.error.issues },
          { status: 400 },
        );
      }
      const updated = await updatePreferences(user.id, parsed.data);
      return NextResponse.json(updated);
    },
  );
}
