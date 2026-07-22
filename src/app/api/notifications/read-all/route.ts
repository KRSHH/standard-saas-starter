import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth";
import { markAllRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

/** POST /api/notifications/read-all — mark all of the user's notifications as read. */
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    { namespace: "notifications-mark", limit: 30, window: 60 },
    async (user) => {
      const updated = await markAllRead(user.id);
      return NextResponse.json({ updated });
    },
  );
}
