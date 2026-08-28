"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ContactRound, Mail, Phone, Search } from "lucide-react";

import { listContactsAction } from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Contact } from "@/lib/data/contacts";
import { useRefreshableServerData } from "@/hooks/use-server-data";
import {
  EmptyState,
  LoadingPanel,
  ScreenHeader,
} from "@/components/dashboard/screen-kit";
import { useWorkspace, useWorkspaceReady } from "@/components/dashboard/workspace-context";

function ContactBookingsLink({
  contact,
  orgSlug,
  bookingLabel,
}: {
  contact: Contact;
  orgSlug: string;
  bookingLabel: string;
}) {
  const href = `/app/${orgSlug}/bookings?q=${encodeURIComponent(contact.name)}`;

  if (contact.bookingCount === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No {bookingLabel.toLowerCase()} yet
      </span>
    );
  }

  return (
    <Button asChild variant="ghost" size="sm" className="h-8 px-2 font-mono text-xs">
      <Link href={href}>
        <CalendarDays className="size-3.5" />
        {contact.bookingCount}
      </Link>
    </Button>
  );
}

export function ContactsScreen() {
  const { organization, terminology } = useWorkspace();
  const workspaceReady = useWorkspaceReady();
  const { data: contacts } = useRefreshableServerData(
    () => listContactsAction(),
    [organization?._id],
    { enabled: workspaceReady },
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return contacts ?? [];
    return (contacts ?? []).filter((contact) =>
      [contact.name, contact.email, contact.phone]
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [contacts, query]);

  const orgSlug = organization?.slug ?? "";

  return (
    <>
      <ScreenHeader
        eyebrow="Customer records"
        title={terminology.customerPlural}
        description={`People who have booked or reached out. ${terminology.customerPlural} are created automatically when a ${terminology.booking.toLowerCase()} is made.`}
      />

      <Card className="bg-white">
        <CardContent className="space-y-4 pt-0">
          <div className="border-b border-black/8 pb-4">
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${terminology.customerPlural.toLowerCase()}…`}
                className="pl-8"
                aria-label={`Search ${terminology.customerPlural.toLowerCase()}`}
              />
            </div>
          </div>

          {!contacts ? (
            <LoadingPanel bare rows={6} label="Loading contacts…" />
          ) : filtered.length ? (
            <div className="-mx-1 overflow-x-auto overscroll-x-contain">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead>{terminology.bookingPlural}</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {filtered.map((contact) => (
                    <TableRow key={contact._id} className="hover:bg-muted/50">
                      <TableCell className="min-w-0">
                        <p className="truncate font-medium">{contact.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground sm:hidden">
                          {contact.email ?? contact.phone ?? "No contact details"}
                        </p>
                      </TableCell>
                      <TableCell className="hidden max-w-48 truncate sm:table-cell">
                        {contact.email ?? "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {contact.phone ?? "—"}
                      </TableCell>
                      <TableCell>
                        <ContactBookingsLink
                          contact={contact}
                          orgSlug={orgSlug}
                          bookingLabel={terminology.bookingPlural}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {contact.email ? (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Email ${contact.name}`}
                            >
                              <a href={`mailto:${contact.email}`}>
                                <Mail />
                              </a>
                            </Button>
                          ) : null}
                          {contact.phone ? (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon-xs"
                              aria-label={`Call ${contact.name}`}
                            >
                              <a href={`tel:${contact.phone}`}>
                                <Phone />
                              </a>
                            </Button>
                          ) : null}
                          {contact.bookingCount > 0 ? (
                            <Button asChild variant="outline" size="sm" className="h-8">
                              <Link
                                href={`/app/${orgSlug}/bookings?q=${encodeURIComponent(contact.name)}`}
                              >
                                View {terminology.bookingPlural.toLowerCase()}
                              </Link>
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              New
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState
              icon={ContactRound}
              compact
              title={
                query
                  ? `No matching ${terminology.customerPlural.toLowerCase()}`
                  : `No ${terminology.customerPlural.toLowerCase()} yet`
              }
              description={
                query
                  ? "Try a different name, email, or phone number."
                  : `${terminology.customerPlural} appear here after someone completes a ${terminology.booking.toLowerCase()} on your public site, through the agent, or from the dashboard.`
              }
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
