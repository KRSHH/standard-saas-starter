import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { withAuth } from "@/lib/auth";
import { countUnread, listNotifications } from "@/lib/notifications/store";

export const runtime = "nodejs";

/** GET /api/notifications — list the current user's notifications + unread count. */
export async function GET(request: NextRequest) {
  return withAuth(
    request,
    { namespace: "notifications-list", limit: 60, window: 60 },
    async (user) => {
      const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
      const [items, unreadCount] = await Promise.all([
        listNotifications(user.id, { unreadOnly }),
        countUnread(user.id),
      ]);
      return NextResponse.json({ items, unreadCount });
    },
  );
}
