import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { markAllRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

/** POST /api/notifications/read-all — mark all of the user's notifications as read. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUserOrNull();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { limited, headers } = await rateLimit(request, {
    namespace: "notifications-mark",
    limit: 30,
    window: 60,
  });
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers },
    );
  }

  const updated = await markAllRead(user.id);
  return NextResponse.json({ updated });
}
