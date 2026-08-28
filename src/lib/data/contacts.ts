import "server-only";

import { requireCurrentOrganizationOperator, ms } from "@/lib/data/auth";

export type Contact = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags: string[];
  bookingCount: number;
  createdAt: number;
  updatedAt: number;
};

export async function listContacts(): Promise<Contact[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("*")
    .eq("organization_id", organization.id)
    .order("updated_at", { ascending: false })
    .limit(501);

  if (contactsError) throw new Error(contactsError.message);
  if ((contacts ?? []).length > 500) {
    throw new Error("Contact limit exceeded.");
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("contact_id")
    .eq("organization_id", organization.id)
    .limit(5_001);

  if (bookingsError) throw new Error(bookingsError.message);

  const bookingCountByContact = new Map<string, number>();
  for (const booking of bookings ?? []) {
    bookingCountByContact.set(
      booking.contact_id,
      (bookingCountByContact.get(booking.contact_id) ?? 0) + 1,
    );
  }

  return (contacts ?? []).map((contact) => ({
    _id: contact.id,
    name: contact.name,
    email: contact.email ?? undefined,
    phone: contact.phone ?? undefined,
    notes: contact.notes ?? undefined,
    tags: contact.tags ?? [],
    bookingCount: bookingCountByContact.get(contact.id) ?? 0,
    createdAt: ms(contact.created_at)!,
    updatedAt: ms(contact.updated_at)!,
  }));
}
