"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";
import { LoaderCircle } from "lucide-react";

export function ClerkAuthPanel({
  children,
  label = "Loading sign-in…",
}: {
  children: ReactNode;
  label?: string;
}) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div
        className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        {label}
      </div>
    );
  }

  return <>{children}</>;
}
