import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withAuth } from "@/lib/auth";
import { createUploadUrl } from "@/lib/uploads/server";
import { logAudit, requestContext } from "@/lib/audit/log";
import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "@/lib/audit/actions";
import type { UploadKind } from "@/lib/uploads/quota";

export const runtime = "nodejs";

const bodySchema = z.object({
  kind: z.enum(["avatars", "attachments"]) as z.ZodType<UploadKind>,
  contentType: z.string().min(1),
  size: z.number().int().positive(),
  filename: z.string().min(1).max(200),
});

/** POST /api/uploads — issue a signed upload URL. Auth-gated + rate-limited. */
export async function POST(request: NextRequest) {
  return withAuth(
    request,
    { namespace: "uploads", limit: 30, window: 60 },
    async (user) => {
      const parsed = bodySchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid payload", issues: parsed.error.issues },
          { status: 400 },
        );
      }

      const result = await createUploadUrl({ user, ...parsed.data });
      if (!result.ok) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status },
        );
      }

      // Best-effort audit — URL minting is the authorization event.
      void logAudit({
        actorId: user.id,
        action: AUDIT_ACTIONS.UPLOAD_CREATED,
        resourceType: AUDIT_RESOURCES.UPLOAD,
        resourceId: result.path,
        metadata: {
          kind: parsed.data.kind,
          contentType: parsed.data.contentType,
          size: parsed.data.size,
        },
        request: requestContext(request),
      });

      return NextResponse.json({
        path: result.path,
        url: result.url,
        token: result.token,
      });
    },
  );
}
