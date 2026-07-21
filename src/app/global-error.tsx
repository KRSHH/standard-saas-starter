"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-muted-foreground max-w-md text-base">
            An unexpected error occurred. Our team has been notified.
          </p>
          {error.digest && (
            <p className="text-muted-foreground font-mono text-xs">
              Error ID: {error.digest}
            </p>
          )}
          <Button onClick={reset}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
