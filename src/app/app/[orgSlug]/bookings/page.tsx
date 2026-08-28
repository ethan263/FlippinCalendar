import { auth } from "@clerk/nextjs/server";

import { BookingsScreen } from "@/components/dashboard/bookings-screen";

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await auth.protect();
  const { q } = await searchParams;

  return <BookingsScreen initialQuery={q ?? ""} />;
}
