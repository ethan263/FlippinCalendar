import { Skeleton } from "@/components/ui/skeleton";

export function AuthFormSkeleton({ label = "Loading sign-in…" }: { label?: string }) {
  return (
    <div className="w-full max-w-sm space-y-4" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <Skeleton className="mx-auto h-8 w-40" />
      <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-4 h-10 w-full" />
        <Skeleton className="mt-3 h-10 w-full" />
        <Skeleton className="mt-6 h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
