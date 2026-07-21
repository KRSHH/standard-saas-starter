import { NextResponse, type NextRequest } from "next/server";

import { getCurrentUserOrNull } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { markRead } from "@/lib/notifications/store";

export const runtime = "nodejs";

/** POST /api/notifications/:id/read — mark one notification as read. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const ok = await markRead(id, user.id);
  if (!ok) {
    return NextResponse.json(
      { error: "Notification not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
