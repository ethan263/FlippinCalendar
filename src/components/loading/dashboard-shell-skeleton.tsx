import { Skeleton } from "@/components/ui/skeleton";

export function DashboardShellSkeleton({
  label = "Opening your workspace…",
}: {
  label?: string;
}) {
  return (
    <div className="flex min-h-svh bg-[#faf9f5]" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <aside className="hidden w-[17.25rem] shrink-0 border-r border-black/10 bg-[#f2f0e9] p-4 md:block">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="mt-6 h-10 w-full rounded-lg" />
        <div className="mt-8 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center gap-3 border-b border-black/10 px-4 sm:px-6">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="ml-auto h-8 w-8 rounded-md" />
        </div>
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
