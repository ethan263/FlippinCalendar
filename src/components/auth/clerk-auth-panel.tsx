"use client";

import type { ReactNode } from "react";
import { useAuth } from "@clerk/nextjs";

import { AuthFormSkeleton } from "@/components/loading/auth-form-skeleton";

export function ClerkAuthPanel({
  children,
  label = "Loading sign-in…",
}: {
  children: ReactNode;
  label?: string;
}) {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return <AuthFormSkeleton label={label} />;
  }

  return <>{children}</>;
}
