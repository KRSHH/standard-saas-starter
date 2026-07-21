"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Notification = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  title: string;
  body: string | null;
  url: string | null;
  readAt: string | null;
  createdAt: string;
};

/**
 * Header notification bell. Polls /api/notifications at a low frequency and
 * surfaces the unread count. Clicking opens a panel that lists recent items
 * and lets the user mark them read.
 */
export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);

  const { data } = useQuery<{ items: Notification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const r = await fetch("/api/notifications?unread=0", {
        cache: "no-store",
      });
      if (!r.ok) return { items: [], unreadCount: 0 };
      return r.json();
    },
    refetchInterval: 60_000, // 1 min — cheap polling for a header badge
    refetchOnWindowFocus: true,
  });

  const unread = data?.unreadCount ?? 0;

  const markAllRead = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      return r.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markOneRead = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
      });
      return r.ok;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unread > 0 ? (
            <span
              className={cn(
                "bg-destructive text-destructive-foreground",
                "absolute -top-0.5 -right-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-medium",
              )}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notifications</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {data?.items.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              You&apos;re all caught up.
            </p>
          ) : null}
          {(data?.items ?? []).slice(0, 10).map((n) => (
            <div
              key={n.id}
              className={cn(
                "flex flex-col gap-1 rounded-md border p-3 text-sm",
                n.readAt ? "opacity-60" : "bg-muted/40",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{n.title}</span>
                {!n.readAt ? (
                  <button
                    className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                    onClick={() => markOneRead.mutate(n.id)}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
              {n.body ? (
                <span className="text-muted-foreground text-xs">{n.body}</span>
              ) : null}
              <span className="text-muted-foreground text-[11px]">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
          {unread > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 self-end"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
