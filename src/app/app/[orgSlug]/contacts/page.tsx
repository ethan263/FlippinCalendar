import { auth } from "@clerk/nextjs/server";

import { ContactsScreen } from "@/components/dashboard/contacts-screen";

export default async function ContactsPage() {
  await auth.protect();

  return <ContactsScreen />;
}
