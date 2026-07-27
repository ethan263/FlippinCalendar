import "server-only";

import type { Offering } from "@/components/dashboard/data";
import { requireCurrentOrganizationOperator } from "@/lib/data/auth";
import {
  MAX_BUFFER_MINUTES,
  MAX_OFFERING_DURATION_MINUTES,
  mapOffering,
  requireOfferingForOrganization,
  type OfferingRow,
} from "@/lib/data/booking-helpers";
import {
  boundedInteger,
  optionalTrimmed,
  requiredTrimmed,
  slugify,
} from "@/lib/data/shared";

export async function listOfferings(args: {
  includeInactive?: boolean;
} = {}): Promise<Offering[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  let query = supabase
    .from("offerings")
    .select("*")
    .eq("organization_id", organization.id)
    .limit(501);
  if (!args.includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as OfferingRow[];
  if (rows.length > 500) throw new Error("Offering limit exceeded.");
  return rows
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
    )
    .map(mapOffering);
}

export async function createOffering(args: {
  name: string;
  description?: string;
  category?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceMinor: number;
  capacity?: number;
  active?: boolean;
  bookableOnline?: boolean;
}): Promise<Offering> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const name = requiredTrimmed(args.name, "name", 120);
  const baseSlug = slugify(name);
  const { data: existing } = await supabase
    .from("offerings")
    .select("id")
    .eq("organization_id", organization.id)
    .eq("slug", baseSlug)
    .maybeSingle();
  const slug = existing
    ? `${baseSlug}-${Date.now().toString(36).slice(-5)}`
    : baseSlug;

  const { data, error } = await supabase
    .from("offerings")
    .insert({
      organization_id: organization.id,
      name,
      slug,
      description: optionalTrimmed(args.description, "description", 2_000) ?? "",
      category: optionalTrimmed(args.category, "category", 80) ?? "General",
      duration_minutes: boundedInteger(
        args.durationMinutes,
        "durationMinutes",
        5,
        MAX_OFFERING_DURATION_MINUTES,
      ),
      buffer_before_minutes: boundedInteger(
        args.bufferBeforeMinutes ?? 0,
        "bufferBeforeMinutes",
        0,
        MAX_BUFFER_MINUTES,
      ),
      buffer_after_minutes: boundedInteger(
        args.bufferAfterMinutes ?? 0,
        "bufferAfterMinutes",
        0,
        MAX_BUFFER_MINUTES,
      ),
      price_minor: boundedInteger(args.priceMinor, "priceMinor", 0, 100_000_000),
      currency: organization.currency,
      capacity: boundedInteger(args.capacity ?? 1, "capacity", 1, 10_000),
      active: args.active ?? true,
      bookable_online: args.bookableOnline ?? true,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapOffering(data as OfferingRow);
}

export async function updateOffering(args: {
  offeringId: string;
  name?: string;
  description?: string;
  category?: string;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  priceMinor?: number;
  capacity?: number;
  active?: boolean;
  bookableOnline?: boolean;
}): Promise<Offering> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const offering = await requireOfferingForOrganization(
    supabase,
    organization.id,
    args.offeringId,
  );

  const { data, error } = await supabase
    .from("offerings")
    .update({
      name: args.name ? requiredTrimmed(args.name, "name", 120) : offering.name,
      description:
        args.description === undefined
          ? offering.description
          : (optionalTrimmed(args.description, "description", 2_000) ?? ""),
      category:
        args.category === undefined
          ? offering.category
          : (optionalTrimmed(args.category, "category", 80) ?? "General"),
      duration_minutes:
        args.durationMinutes === undefined
          ? offering.duration_minutes
          : boundedInteger(
              args.durationMinutes,
              "durationMinutes",
              5,
              MAX_OFFERING_DURATION_MINUTES,
            ),
      buffer_before_minutes:
        args.bufferBeforeMinutes === undefined
          ? offering.buffer_before_minutes
          : boundedInteger(
              args.bufferBeforeMinutes,
              "bufferBeforeMinutes",
              0,
              MAX_BUFFER_MINUTES,
            ),
      buffer_after_minutes:
        args.bufferAfterMinutes === undefined
          ? offering.buffer_after_minutes
          : boundedInteger(
              args.bufferAfterMinutes,
              "bufferAfterMinutes",
              0,
              MAX_BUFFER_MINUTES,
            ),
      price_minor:
        args.priceMinor === undefined
          ? offering.price_minor
          : boundedInteger(args.priceMinor, "priceMinor", 0, 100_000_000),
      capacity:
        args.capacity === undefined
          ? offering.capacity
          : boundedInteger(args.capacity, "capacity", 1, 10_000),
      active: args.active ?? offering.active,
      bookable_online: args.bookableOnline ?? offering.bookable_online,
      updated_at: new Date().toISOString(),
    })
    .eq("id", offering.id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapOffering(data as OfferingRow);
}
