import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { countUnread, listNotifications } from "@/lib/notifications/store";

export const runtime = "nodejs";

/** GET /api/notifications — list the current user's notifications + unread count. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { limited, headers } = await rateLimit(request, {
    namespace: "notifications-list",
    limit: 60,
    window: 60,
  });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers },
    );
  }

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "1";
  const [items, unreadCount] = await Promise.all([
    listNotifications(user.id, { unreadOnly }),
    countUnread(user.id),
  ]);
  return NextResponse.json({ items, unreadCount });
}
