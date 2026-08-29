"use client";

import Link from "next/link";
import { OrganizationProfile } from "@clerk/nextjs";
import {
  Building2,
  Clock3,
  Globe2,
  Languages,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LoadingPanel,
  ScreenHeader,
  SectionHeading,
} from "@/components/dashboard/screen-kit";
import { getCurrentDraftAction } from "@/app/actions/dashboard";
import { useRefreshableServerData } from "@/hooks/use-server-data";
import { usePlatformRefresh } from "@/components/dashboard/platform-refresh-context";
import { useWorkspace, useWorkspaceReady } from "@/components/dashboard/workspace-context";
import { WorkspaceLanguageEditor } from "@/components/dashboard/workspace-language-editor";
import { WorkspaceIdentityEditor } from "@/components/dashboard/workspace-identity-editor";
import { AgentWorkspaceSettings } from "@/components/dashboard/agent-workspace-settings";

export function SettingsScreen() {
  const { organization, orgSlug } = useWorkspace();
  const workspaceReady = useWorkspaceReady();
  const { draftVersion } = usePlatformRefresh();
  const isPersonalWorkspace = Boolean(organization && !organization.clerkOrgId);
  const { data: publicSite } = useRefreshableServerData(
    () => getCurrentDraftAction(orgSlug),
    [organization?._id, orgSlug, draftVersion],
    { enabled: workspaceReady },
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Workspace administration"
        title="Settings"
        description={
          isPersonalWorkspace
            ? "Configure your business identity, language, timezone, and AI concierge settings."
            : "Configure organization identity, workspace language, members, and access."
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)]">
        {organization ? (
          isPersonalWorkspace ? (
            <WorkspaceIdentityEditor
              key={organization._id}
              organization={organization}
              publicSlug={publicSite?.site.siteSlug}
              orgSlug={orgSlug}
            />
          ) : (
            <Card className="h-fit bg-white">
              <CardHeader className="border-b border-black/8 pb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="size-4 text-primary" />
                  <CardTitle className="font-heading text-xl tracking-tight">
                    Organization profile
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs text-muted-foreground">Name</span>
                  <span className="text-right text-xs font-medium">
                    {organization.name}
                  </span>
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock3 className="size-3.5" /> Timezone
                  </span>
                  <span className="max-w-44 text-right font-mono text-[10px] font-medium">
                    {organization.timezone || "Not configured"}
                  </span>
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Languages className="size-3.5" /> Locale
                  </span>
                  <span className="font-mono text-[10px] font-medium">
                    {organization.locale} · {organization.currency}
                  </span>
                </div>
                <Separator />
                <div className="flex items-start justify-between gap-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Globe2 className="size-3.5" /> Public booking link
                  </span>
                  <span className="font-mono text-[10px] font-medium">
                    /p/{publicSite?.site.siteSlug ?? "—"}
                  </span>
                </div>
                <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
                  <Link href={`/app/${orgSlug}/public-site`}>Change link</Link>
                </Button>
              </CardContent>
            </Card>
          )
        ) : (
          <LoadingPanel rows={6} label="Loading workspace settings…" />
        )}

        {organization ? (
          <WorkspaceLanguageEditor
            key={`${organization._id}-language`}
            organization={organization}
          />
        ) : (
          <LoadingPanel rows={6} label="Loading workspace settings…" />
        )}
      </section>

      {organization ? (
        <section className="mt-8">
          <AgentWorkspaceSettings organizationId={organization._id} />
        </section>
      ) : null}

      {organization?.clerkOrgId ? (
        <section className="mt-8 space-y-4">
          <SectionHeading
            title="Members & access"
            description="Manage Clerk organization details, members, roles, and invitations."
          />
          <div className="min-w-0 overflow-hidden rounded-xl border border-black/10 bg-white p-2 sm:p-4">
            <OrganizationProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none",
                  card: "w-full shadow-none border-0",
                  navbar: "border-r border-black/10",
                  navbarButton: "text-foreground",
                  pageScrollBox: "p-0",
                },
              }}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
