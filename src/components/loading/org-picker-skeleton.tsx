import { Skeleton } from "@/components/ui/skeleton";

export function OrgPickerSkeleton() {
  return (
    <div className="w-full max-w-md space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Loading your businesses…</span>
      <Skeleton className="mx-auto h-8 w-40" />
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-14 w-full rounded-lg" />
        <Skeleton className="mt-2 h-14 w-full rounded-lg" />
        <Skeleton className="mt-4 h-10 w-full rounded-md" />
      </div>
    </div>
  );
}
