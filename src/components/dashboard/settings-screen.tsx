"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import {
  Building2,
  Clock3,
  Globe2,
  Languages,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AgentWorkspaceSettings } from "@/components/dashboard/agent-workspace-settings";

export function SettingsScreen() {
  const { organization } = useWorkspace();
  const workspaceReady = useWorkspaceReady();
  const { draftVersion } = usePlatformRefresh();
  const { data: publicSite } = useRefreshableServerData(
    () => getCurrentDraftAction(),
    [organization?._id, draftVersion],
    { enabled: workspaceReady },
  );

  return (
    <>
      <ScreenHeader
        eyebrow="Business administration"
        title="Settings"
        description="Configure your business name, language, members, and access."
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)]">
        <Card className="h-fit bg-white">
          <CardHeader className="border-b border-black/8 pb-4">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              <CardTitle className="font-heading text-xl tracking-tight">
                Business profile
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-right text-xs font-medium">
                {organization?.name ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" /> Timezone
              </span>
              <span className="max-w-44 text-right font-mono text-[10px] font-medium">
                {organization?.timezone ?? "Not configured"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Languages className="size-3.5" /> Locale
              </span>
              <span className="font-mono text-[10px] font-medium">
                {organization?.locale ?? "—"} · {organization?.currency ?? "—"}
              </span>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Globe2 className="size-3.5" /> Public slug
              </span>
              <span className="font-mono text-[10px] font-medium">
                /p/{publicSite?.site.siteSlug ?? "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        {organization ? (
          <WorkspaceLanguageEditor
            key={organization._id}
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

      <section className="mt-8 space-y-4">
        <SectionHeading
          title="Members & access"
          description="Manage business details, members, roles, and invitations."
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
    </>
  );
}
