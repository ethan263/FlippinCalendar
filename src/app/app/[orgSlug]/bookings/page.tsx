import { BookingsScreen } from "@/components/dashboard/bookings-screen";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  return <BookingsScreen initialQuery={q ?? ""} />;
}
