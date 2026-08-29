"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { Building2, Clock3, Globe2, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { updateCurrentOrganizationAction } from "@/app/actions/organizations";
import { useWorkspace } from "@/components/dashboard/workspace-context";
import type { Organization } from "@/components/dashboard/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIMEZONE_OPTIONS = [
  "Africa/Johannesburg",
  "Africa/Cairo",
  "Africa/Lagos",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/New_York",
  "America/Sao_Paulo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/London",
  "Europe/Paris",
  "Pacific/Auckland",
  "UTC",
] as const;

const CURRENCY_OPTIONS = ["ZAR", "USD", "EUR", "GBP", "AUD", "CAD"] as const;

const LOCALE_OPTIONS = [
  { value: "en-ZA", label: "English (South Africa)" },
  { value: "en-US", label: "English (United States)" },
  { value: "en-GB", label: "English (United Kingdom)" },
  { value: "en-AU", label: "English (Australia)" },
  { value: "af-ZA", label: "Afrikaans (South Africa)" },
] as const;

type IdentityDraft = {
  name: string;
  timezone: string;
  currency: string;
  locale: string;
};

function toDraft(organization: Organization): IdentityDraft {
  return {
    name: organization.name,
    timezone: organization.timezone,
    currency: organization.currency,
    locale: organization.locale,
  };
}

export function WorkspaceIdentityEditor({
  organization,
  publicSlug,
  orgSlug,
}: {
  organization: Organization;
  publicSlug?: string;
  orgSlug: string;
}) {
  const { refreshOrganization } = useWorkspace();
  const [draft, setDraft] = useState<IdentityDraft>(() => toDraft(organization));
  const [baseline, setBaseline] = useState<IdentityDraft>(() => toDraft(organization));
  const [saving, setSaving] = useState(false);

  const timezoneOptions = useMemo(() => {
    const options = new Set<string>(TIMEZONE_OPTIONS);
    if (draft.timezone.trim()) options.add(draft.timezone.trim());
    if (organization.timezone.trim()) options.add(organization.timezone.trim());
    return Array.from(options).sort();
  }, [draft.timezone, organization.timezone]);

  const isDirty = useMemo(
    () =>
      draft.name.trim() !== baseline.name.trim() ||
      draft.timezone.trim() !== baseline.timezone.trim() ||
      draft.currency.trim() !== baseline.currency.trim() ||
      draft.locale.trim() !== baseline.locale.trim(),
    [baseline, draft],
  );

  const hasNewerServerIdentity = useMemo(
    () =>
      organization.name !== baseline.name ||
      organization.timezone !== baseline.timezone ||
      organization.currency !== baseline.currency ||
      organization.locale !== baseline.locale,
    [baseline, organization],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = draft.name.trim();
    const timezone = draft.timezone.trim();
    const currency = draft.currency.trim().toUpperCase();
    const locale = draft.locale.trim();

    if (!name || !timezone || !currency || !locale) {
      toast.error("Complete every identity field before saving.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateCurrentOrganizationAction({
        name,
        timezone,
        currency,
        locale,
      });
      const next = toDraft(updated);
      setDraft(next);
      setBaseline(next);
      await refreshOrganization();
      toast.success("Business identity updated");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update business identity",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="h-fit bg-white">
      <CardHeader className="border-b border-black/8 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <div>
              <CardTitle className="font-heading text-xl tracking-tight">
                Business identity
              </CardTitle>
              <CardDescription className="mt-1 max-w-xl text-xs leading-5">
                Name, timezone, and regional settings for bookings, availability,
                and your public page.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">Personal workspace</Badge>
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit} aria-busy={saving}>
        <CardContent className="space-y-4 pt-5">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Business name</Label>
            <Input
              id="workspace-name"
              value={draft.name}
              maxLength={120}
              disabled={saving}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="workspace-timezone" className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" />
              Timezone
            </Label>
            <Select
              value={draft.timezone}
              disabled={saving}
              onValueChange={(timezone) =>
                setDraft((current) => ({ ...current, timezone }))
              }
            >
              <SelectTrigger id="workspace-timezone" className="w-full">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((timezone) => (
                  <SelectItem key={timezone} value={timezone}>
                    {timezone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="workspace-currency">Currency</Label>
              <Select
                value={draft.currency}
                disabled={saving}
                onValueChange={(currency) =>
                  setDraft((current) => ({ ...current, currency }))
                }
              >
                <SelectTrigger id="workspace-currency" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCY_OPTIONS.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="workspace-locale" className="inline-flex items-center gap-1.5">
                <Globe2 className="size-3.5" />
                Locale
              </Label>
              <Select
                value={draft.locale}
                disabled={saving}
                onValueChange={(locale) =>
                  setDraft((current) => ({ ...current, locale }))
                }
              >
                <SelectTrigger id="workspace-locale" className="w-full">
                  <SelectValue placeholder="Select locale" />
                </SelectTrigger>
                <SelectContent>
                  {LOCALE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {publicSlug ? (
            <div className="rounded-lg border border-black/8 bg-[#faf9f6] px-3 py-2.5">
              <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Public booking link
              </p>
              <p className="mt-1 font-mono text-[11px] font-medium">/p/{publicSlug}</p>
              <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0 text-xs">
                <Link href={`/app/${orgSlug}/public-site`}>Change link on Public Site</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="flex-wrap justify-between gap-3">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {hasNewerServerIdentity
              ? "Another session changed these settings. Save to replace them, or reload the page."
              : isDirty
                ? "You have unsaved identity changes."
                : "Business identity is up to date."}
          </p>
          <Button type="submit" disabled={!isDirty || saving}>
            {saving ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Save />
            )}
            {saving ? "Saving…" : "Save identity"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
