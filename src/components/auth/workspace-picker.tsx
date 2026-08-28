"use client";

import Link from "next/link";
import { OrganizationList } from "@clerk/nextjs";
import { ArrowRight, Building2, UserRound } from "lucide-react";

import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccessibleWorkspace } from "@/lib/workspaces";

type WorkspacePickerProps = {
  workspaces: AccessibleWorkspace[];
  afterOrganizationUrl: string;
};

function roleLabel(role: string | undefined, mode: AccessibleWorkspace["mode"]) {
  if (mode === "personal") return "Personal workspace";
  if (role === "admin" || role === "owner") return "Admin";
  if (role === "operator") return "Operator";
  if (role === "member") return "Member";
  return "Team member";
}

export function WorkspacePicker({
  workspaces,
  afterOrganizationUrl,
}: WorkspacePickerProps) {
  const personalWorkspaces = workspaces.filter(
    (workspace) => workspace.mode === "personal",
  );
  const organizationWorkspaces = workspaces.filter(
    (workspace) => workspace.mode === "organization",
  );

  return (
    <main className="grid min-h-svh place-items-center bg-[#f3f0e8] px-4 py-12 text-foreground">
      <section className="w-full max-w-5xl overflow-hidden rounded-2xl border border-black/10 bg-[#faf9f5] shadow-[0_24px_70px_rgba(44,36,24,0.12)]">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex min-h-72 flex-col justify-between border-b border-black/10 bg-[#1c1c1a] p-7 text-white lg:min-h-[620px] lg:border-r lg:border-b-0 lg:p-10">
            <Brand href="/" inverted size="sm" subtitle="Operations desk" />

            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-white/45 uppercase">
                Choose a workspace
              </p>
              <h1 className="mt-4 max-w-sm font-heading text-4xl leading-[0.98] font-semibold tracking-[-0.035em] sm:text-5xl">
                Pick the business you want to operate.
              </h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">
                Open your personal workspace or a Clerk organization you belong
                to. Each workspace keeps its own bookings, agent, and public
                page.
              </p>
            </div>

            <div className="hidden items-center gap-3 text-xs text-white/45 lg:flex">
              <Building2 className="size-4" />
              Organization or personal
              <ArrowRight className="ml-auto size-4" />
            </div>
          </div>

          <div className="flex flex-col gap-6 p-5 sm:p-10">
            {personalWorkspaces.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Personal workspace
                </p>
                {personalWorkspaces.map((workspace) => (
                  <Button
                    key={workspace.slug}
                    asChild
                    variant="outline"
                    className="h-auto w-full justify-between bg-white px-4 py-3 text-left"
                  >
                    <Link href={`/app/${workspace.slug}`}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-md border border-black/10 bg-[#f7f5ef]">
                          <UserRound className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {workspace.name}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            Solo business · full admin access
                          </span>
                        </span>
                      </span>
                      <Badge variant="outline" className="shrink-0 bg-white">
                        {roleLabel(workspace.role, workspace.mode)}
                      </Badge>
                    </Link>
                  </Button>
                ))}
              </div>
            ) : null}

            {organizationWorkspaces.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  Organizations
                </p>
                <div className="space-y-2">
                  {organizationWorkspaces.map((workspace) => (
                    <div
                      key={workspace.clerkOrgId ?? workspace.slug}
                      className="rounded-lg border border-black/10 bg-white px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{workspace.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {workspace.isBootstrapped
                              ? "Ready in flippinCalendar"
                              : "Select below to initialize"}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0 bg-white">
                          {roleLabel(workspace.role, workspace.mode)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Select or create an organization
              </p>
              <OrganizationList
                hidePersonal
                afterCreateOrganizationUrl={afterOrganizationUrl}
                afterSelectOrganizationUrl={afterOrganizationUrl}
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    cardBox: "w-full shadow-none",
                    card: "w-full border border-black/10 bg-white shadow-none",
                    headerTitle: "font-heading text-2xl tracking-tight",
                    headerSubtitle: "text-muted-foreground",
                    organizationListCreateOrganizationActionButton:
                      "border-primary/20 text-primary hover:bg-primary/5",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
