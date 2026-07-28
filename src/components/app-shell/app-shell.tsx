"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import {
  Bot,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  LayoutDashboard,
  LockKeyhole,
  PanelsTopLeft,
  Settings2,
  Sparkles,
  UsersRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  type Terminology,
} from "@/components/dashboard/data";
import { useFeatureEntitlements } from "@/components/dashboard/feature-gates";
import { getCurrentDraftAction } from "@/app/actions/dashboard";
import { useServerData } from "@/hooks/use-server-data";
import {
  WorkspaceProvider,
  useWorkspace,
} from "@/components/dashboard/workspace-context";

type NavItem = {
  label: string;
  segment: string;
  icon: typeof LayoutDashboard;
};

function navigationFor(
  terminology: Terminology,
): Array<{ label: string; items: NavItem[] }> {
  return [
    {
      label: "Operate",
      items: [
        { label: "Overview", segment: "", icon: LayoutDashboard },
        {
          label: terminology.bookingPlural,
          segment: "bookings",
          icon: CalendarDays,
        },
        {
          label: terminology.offeringPlural,
          segment: "offerings",
          icon: CircleDollarSign,
        },
        {
          label: terminology.teamMemberPlural,
          segment: "team",
          icon: UsersRound,
        },
        { label: "Availability", segment: "availability", icon: Clock3 },
      ],
    },
    {
      label: "Experience",
      items: [
        { label: "AI Agent", segment: "voice-agent", icon: Bot },
        { label: "Public Site", segment: "public-site", icon: PanelsTopLeft },
      ],
    },
    {
      label: "Workspace",
      items: [
        { label: "Billing", segment: "billing", icon: CreditCard },
        { label: "Settings", segment: "settings", icon: Settings2 },
      ],
    },
  ];
}

function WorkspaceNavigation({
  navigation,
  orgSlug,
}: {
  navigation: Array<{ label: string; items: NavItem[] }>;
  orgSlug: string;
}) {
  const pathname = usePathname();
  const entitlements = useFeatureEntitlements();
  const aiAgentLocked =
    entitlements.isLoaded && !entitlements.hasAiAgent;

  return (
    <>
      {navigation.map((section) => (
        <SidebarGroup
          key={section.label}
          className="px-2 py-2 group-data-[collapsible=icon]:px-1.5"
        >
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold tracking-[0.18em] text-sidebar-foreground/45 uppercase">
            {section.label}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {section.items.map((item) => {
                const href = item.segment
                  ? `/app/${orgSlug}/${item.segment}`
                  : `/app/${orgSlug}`;
                const isActive = item.segment
                  ? pathname === href || pathname.startsWith(`${href}/`)
                  : pathname === href;
                const Icon = item.icon;
                const locked =
                  item.segment === "voice-agent" && aiAgentLocked;

                return (
                  <SidebarMenuItem key={item.segment || "overview"}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={
                        locked ? `${item.label} · Upgrade` : item.label
                      }
                      className={cn(
                        "h-9 rounded-md px-2.5 text-[13px] transition-colors",
                        isActive &&
                          "bg-foreground text-background hover:bg-foreground hover:text-background",
                        locked && !isActive && "text-sidebar-foreground/55",
                      )}
                    >
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                        {item.segment === "voice-agent" &&
                          (locked ? (
                            <LockKeyhole className="ml-auto size-3.5 opacity-70 group-data-[collapsible=icon]:hidden" />
                          ) : (
                            <span className="ml-auto size-1.5 rounded-full bg-primary group-data-[collapsible=icon]:hidden" />
                          ))}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function HoverExpandSidebar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { setOpen, isMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className={className}
      onMouseEnter={() => {
        if (!isMobile) setOpen(true);
      }}
      onMouseLeave={() => {
        if (!isMobile) setOpen(false);
      }}
    >
      {children}
    </Sidebar>
  );
}

function ShellChrome({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  const pathname = usePathname();
  const { organization, isBootstrapping, bootstrapError, terminology } =
    useWorkspace();
  const publicSite = useServerData(
    () => getCurrentDraftAction(),
    [organization?._id],
  );
  const navigation = navigationFor(terminology);
  const routeLabels = Object.fromEntries(
    navigation.flatMap((section) =>
      section.items.map((item) => [item.segment, item.label]),
    ),
  );
  const segment = pathname.split("/").filter(Boolean)[2] ?? "";
  const pageLabel = routeLabels[segment] ?? "Overview";
  const organizationName = organization?.name ?? "Your organization";
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <SidebarProvider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      defaultOpen={false}
      style={
        {
          "--sidebar-width": "17.25rem",
          "--sidebar-width-icon": "3.5rem",
        } as CSSProperties
      }
    >
      <HoverExpandSidebar className="border-r border-black/10 bg-[#f2f0e9]">
        <SidebarHeader className="gap-4 px-3 pt-4 pb-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <Link
            href={`/app/${orgSlug}`}
            className="group/brand flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:justify-center"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground shadow-[0_2px_0_rgba(0,0,0,0.16)] transition-transform group-hover/brand:-rotate-2">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="block font-heading text-[17px] leading-none font-semibold tracking-[-0.02em]">
                flippinCalendar
              </span>
              <span className="mt-1 block text-[9px] font-semibold tracking-[0.18em] text-sidebar-foreground/45 uppercase">
                Operations desk
              </span>
            </span>
          </Link>

          <div className="rounded-lg border border-black/10 bg-white/70 px-2 py-1 shadow-[0_1px_0_rgba(0,0,0,0.05)] group-data-[collapsible=icon]:hidden">
            <OrganizationSwitcher
              hidePersonal
              afterCreateOrganizationUrl="/app/:slug"
              afterSelectOrganizationUrl="/app/:slug"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  organizationSwitcherTrigger:
                    "w-full justify-between border-0 bg-transparent px-1 py-1 shadow-none",
                  organizationPreviewMainIdentifier:
                    "text-xs font-medium text-foreground",
                  organizationPreviewSecondaryIdentifier:
                    "text-[10px] text-muted-foreground",
                },
              }}
            />
          </div>
        </SidebarHeader>

        <Separator className="bg-black/10 group-data-[collapsible=icon]:mx-2" />
        <SidebarContent className="py-2">
          <WorkspaceNavigation navigation={navigation} orgSlug={orgSlug} />
        </SidebarContent>

        <SidebarFooter className="p-3 group-data-[collapsible=icon]:p-2">
          <div className="rounded-lg border border-black/10 bg-white/55 p-3 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
            <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:hidden">
              <p className="text-[10px] font-semibold tracking-[0.14em] text-sidebar-foreground/50 uppercase">
                Live workspace
              </p>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-medium ${
                  bootstrapError && !organization
                    ? "text-rose-700"
                    : isBootstrapping
                      ? "text-amber-700"
                      : "text-emerald-700"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    bootstrapError && !organization
                      ? "bg-rose-500"
                      : isBootstrapping
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                  }`}
                />
                {bootstrapError && !organization
                  ? "Sync failed"
                  : isBootstrapping
                    ? "Syncing"
                    : "Synced"}
              </span>
            </div>
            <p className="mt-2 truncate text-xs font-medium group-data-[collapsible=icon]:hidden">
              {isBootstrapping ? "Preparing workspace…" : organizationName}
            </p>
            <span
              className={`hidden size-2 rounded-full group-data-[collapsible=icon]:block ${
                bootstrapError && !organization
                  ? "bg-rose-500"
                  : isBootstrapping
                    ? "bg-amber-500"
                    : "bg-emerald-500"
              }`}
              title={
                bootstrapError && !organization
                  ? "Sync failed"
                  : isBootstrapping
                    ? "Syncing"
                    : "Synced"
              }
            />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </HoverExpandSidebar>

      <SidebarInset className="min-w-0 bg-[#faf9f5]">
        <header className="sticky top-0 z-30 flex h-14 items-center border-b border-black/10 bg-[#faf9f5]/95 px-4 supports-backdrop-filter:bg-[#faf9f5]/85 supports-backdrop-filter:backdrop-blur-md sm:px-6">
          <SidebarTrigger className="mr-3 md:hidden" />

          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <span className="hidden truncate text-muted-foreground sm:inline">
              {organizationName}
            </span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground/45 sm:block" />
            <span className="truncate font-medium">{pageLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden border-black/10 bg-white px-2 text-[10px] font-semibold tracking-[0.12em] uppercase sm:inline-flex"
            >
              {organization?.timezone ?? "Timezone pending"}
            </Badge>
            <Button asChild variant="outline" size="sm" className="hidden sm:flex">
              <Link
                href={`/p/${publicSite?.site.siteSlug ?? orgSlug}`}
                target="_blank"
              >
                Open public page
              </Link>
            </Button>
            <UserButton
              appearance={{ elements: { avatarBox: "size-8 rounded-md" } }}
            />
          </div>
        </header>

        <main className="min-h-[calc(100svh-3.5rem)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-360">
            {bootstrapError && !organization && !isBootstrapping ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-900">
                <p className="font-heading text-lg font-semibold tracking-tight">
                  Workspace could not sync
                </p>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-rose-800/90">
                  {bootstrapError}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AppShell({
  children,
  orgSlug,
}: {
  children: ReactNode;
  orgSlug: string;
}) {
  return (
    <WorkspaceProvider orgSlug={orgSlug}>
      <ShellChrome orgSlug={orgSlug}>{children}</ShellChrome>
    </WorkspaceProvider>
  );
}
