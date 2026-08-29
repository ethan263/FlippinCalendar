"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { AuthFormSkeleton } from "@/components/loading/auth-form-skeleton";
import { Button } from "@/components/ui/button";

const CLERK_UI_SELECTOR = ".cl-rootBox, .cl-card, [class*='cl-']";
const LOAD_TIMEOUT_MS = 12_000;

export function ClerkAuthPanel({
  children,
  label = "Loading sign-in…",
}: {
  children: ReactNode;
  label?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) {
      return;
    }

    const hasClerkUi = () => Boolean(root.querySelector(CLERK_UI_SELECTOR));

    if (hasClerkUi()) {
      setShowSkeleton(false);
      return;
    }

    const observer = new MutationObserver(() => {
      if (hasClerkUi()) {
        setShowSkeleton(false);
        setLoadFailed(false);
        observer.disconnect();
      }
    });

    observer.observe(root, { childList: true, subtree: true });

    const timeout = window.setTimeout(() => {
      if (!hasClerkUi()) {
        setLoadFailed(true);
        setShowSkeleton(false);
      }
      observer.disconnect();
    }, LOAD_TIMEOUT_MS);

    return () => {
      observer.disconnect();
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-[280px] w-full">
      {children}
      {showSkeleton ? (
        <div
          className="absolute inset-0 z-10 bg-background"
          aria-hidden={loadFailed ? undefined : true}
        >
          <AuthFormSkeleton label={label} />
        </div>
      ) : null}
      {loadFailed ? (
        <div
          className="rounded-xl border border-destructive/30 bg-white p-6 text-sm"
          role="alert"
        >
          <p className="font-medium text-foreground">
            Sign-in could not load
          </p>
          <p className="mt-2 text-muted-foreground">
            Check your connection, disable ad or privacy blockers for this
            site, then try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
