import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth";
import { markRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

/** POST /api/notifications/:id/read — mark one notification as read. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return withAuth(
    request,
    { namespace: "notifications-mark", limit: 30, window: 60 },
    async (user) => {
      const { id } = await params;
      const ok = await markRead(id, user.id);
      if (!ok) {
        return NextResponse.json(
          { error: "Notification not found." },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true });
    },
  );
}
