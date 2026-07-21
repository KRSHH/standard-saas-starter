"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { setAvatarPath } from "@/lib/auth/actions";
import { UPLOAD_LIMITS } from "@/lib/uploads/quota";

/**
 * Avatar uploader. Fetches a short-lived signed URL from /api/uploads, PUTs
 * the file directly to Supabase Storage (bytes never hit our server), then
 * records the resulting path on the profile via a server action.
 *
 * The current avatar is rendered from `avatarUrl` supplied by the server
 * (a fresh signed URL is generated there on each page load).
 */
export function AvatarUploader({
  initialAvatarUrl,
  fullName,
  email,
}: {
  initialAvatarUrl: string | null;
  fullName: string;
  email: string;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    initialAvatarUrl,
  );

  const initials = (fullName || email).slice(0, 2).toUpperCase();

  const onFileSelected = async (file: File) => {
    setIsUploading(true);
    try {
      // 1. Mint a signed upload URL.
      const mintRes = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "avatars",
          contentType: file.type,
          size: file.size,
          filename: file.name,
        }),
      });
      if (!mintRes.ok) {
        const body = (await mintRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        toast.error(body?.error ?? `Upload rejected (${mintRes.status}).`);
        return;
      }
      const mint = (await mintRes.json()) as {
        path: string;
        url: string;
        token: string;
      };

      // 2. PUT the file directly to Supabase Storage.
      const putRes = await fetch(mint.url, {
        method: "PUT",
        body: file,
        headers: {
          "content-type": file.type,
          "x-upsert": "false",
        },
      });
      if (!putRes.ok) {
        toast.error("Upload failed during transfer.");
        return;
      }

      // 3. Persist the path on the profile (server action).
      const persist = await setAvatarPath(mint.path);
      if (!persist.ok) {
        toast.error(persist.error);
        return;
      }

      // 4. Local preview — read the file as a data URL for instant feedback.
      const dataUrl = await file.arrayBuffer().then((buf) => {
        const blob = new Blob([buf], { type: file.type });
        return URL.createObjectURL(blob);
      });
      setPreviewUrl((old) => {
        if (old?.startsWith("blob:")) URL.revokeObjectURL(old);
        return dataUrl;
      });
      toast.success("Avatar updated.");
      router.refresh();
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {previewUrl ? <AvatarImage src={previewUrl} alt="Avatar" /> : null}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          id="avatar-upload"
          type="file"
          accept={UPLOAD_LIMITS.allowedMimeTypes.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFileSelected(file);
          }}
          disabled={isUploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          Upload avatar
        </Button>
        <p className="text-muted-foreground text-xs">
          PNG, JPEG, WebP, or GIF. Max{" "}
          {Math.round(UPLOAD_LIMITS.maxFileSizeBytes / 1_000_000)} MB.
        </p>
      </div>
    </div>
  );
}
