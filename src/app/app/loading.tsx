import { OrgPickerSkeleton } from "@/components/loading/org-picker-skeleton";

export default function AppLoading() {
  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-12">
      <OrgPickerSkeleton />
    </main>
  );
}
