"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  listKnowledgeAction,
  removeKnowledgeAction,
  upsertKnowledgeAction,
} from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeItem } from "@/lib/data/knowledge";
import { useRefreshableServerData } from "@/hooks/use-server-data";
import {
  EmptyState,
  LoadingPanel,
  ScreenHeader,
  StatusBadge,
  SubmitButton,
} from "@/components/dashboard/screen-kit";
import { useWorkspace, useWorkspaceReady } from "@/components/dashboard/workspace-context";

function KnowledgeDialog({
  item,
  onMutated,
}: {
  item?: KnowledgeItem;
  onMutated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [category, setCategory] = useState(item?.category ?? "General");
  const [published, setPublished] = useState(item?.published ?? true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      knowledgeItemId: item?._id,
      title: String(form.get("title") ?? "").trim(),
      content: String(form.get("content") ?? "").trim(),
      category,
      published,
      sortOrder: item?.sortOrder ?? 0,
    };

    setPending(true);
    try {
      await upsertKnowledgeAction(payload);
      toast.success(item ? "Knowledge item updated" : "Knowledge item created");
      onMutated();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save knowledge item",
      );
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (
      !window.confirm(
        `Remove "${item.title}"? The AI agent and public FAQ will no longer include this answer.`,
      )
    ) {
      return;
    }

    setDeletePending(true);
    try {
      await removeKnowledgeAction(item._id);
      toast.success("Knowledge item removed");
      onMutated();
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove knowledge item",
      );
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${item.title}`}>
            <Pencil />
          </Button>
        ) : (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/85">
            <Plus /> Add item
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-tight">
            {item ? "Edit" : "Add"} knowledge item
          </DialogTitle>
          <DialogDescription>
            Published items feed your AI agent and public FAQ. Keep answers concise
            and factual.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`knowledge-title-${item?._id ?? "new"}`}>Title</Label>
              <Input
                id={`knowledge-title-${item?._id ?? "new"}`}
                name="title"
                defaultValue={item?.title}
                required
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`knowledge-category-${item?._id ?? "new"}`}>
                Category
              </Label>
              <Input
                id={`knowledge-category-${item?._id ?? "new"}`}
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="General, Policies, Pricing…"
                required
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-black/10 bg-muted/35 p-3">
              <div>
                <Label htmlFor={`knowledge-published-${item?._id ?? "new"}`}>
                  Published
                </Label>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Visible to the agent and public site.
                </p>
              </div>
              <Switch
                id={`knowledge-published-${item?._id ?? "new"}`}
                checked={published}
                onCheckedChange={setPublished}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`knowledge-content-${item?._id ?? "new"}`}>
                Answer
              </Label>
              <Textarea
                id={`knowledge-content-${item?._id ?? "new"}`}
                name="content"
                defaultValue={item?.content}
                rows={6}
                required
                placeholder="Write the answer your agent should give when this topic comes up."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            {item ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deletePending || pending}
                onClick={() => void handleDelete()}
              >
                {deletePending ? null : <Trash2 />}
                Remove
              </Button>
            ) : (
              <span />
            )}
            <SubmitButton pending={pending}>
              {item ? "Save changes" : "Add item"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function KnowledgeBaseScreen() {
  const { organization } = useWorkspace();
  const workspaceReady = useWorkspaceReady();
  const { data: items, refresh: refreshItems } = useRefreshableServerData(
    () => listKnowledgeAction({ includeUnpublished: true }),
    [organization?._id],
    { enabled: workspaceReady },
  );

  const groupedItems = useMemo(() => {
    if (!items?.length) return [];
    const groups = new Map<string, KnowledgeItem[]>();
    for (const item of items) {
      const bucket = groups.get(item.category) ?? [];
      bucket.push(item);
      groups.set(item.category, bucket);
    }
    return [...groups.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
  }, [items]);

  return (
    <>
      <ScreenHeader
        eyebrow="Agent context"
        title="Knowledge base"
        description="Manage the answers your AI agent and public FAQ can draw on. Published items are injected into agent sessions automatically."
        action={<KnowledgeDialog onMutated={refreshItems} />}
      />

      {!items ? (
        <LoadingPanel rows={5} label="Loading knowledge…" />
      ) : items.length ? (
        <div className="space-y-8">
          {groupedItems.map(([category, categoryItems]) => (
            <section key={category} className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="font-heading text-lg font-semibold tracking-tight">
                  {category}
                </h2>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {categoryItems.length}
                </Badge>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryItems.map((item) => (
                  <Card key={item._id} className="bg-white">
                    <CardContent className="flex h-full flex-col pt-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-heading text-lg font-semibold tracking-tight">
                            {item.title}
                          </h3>
                          <div className="mt-2">
                            <StatusBadge
                              status={item.published ? "published" : "draft"}
                            />
                          </div>
                        </div>
                        <KnowledgeDialog item={item} onMutated={refreshItems} />
                      </div>
                      <p className="mt-5 line-clamp-4 min-h-16 text-xs leading-5 text-muted-foreground">
                        {item.content}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Add your first knowledge item"
          description="Capture policies, pricing notes, and common questions so your AI agent can answer accurately."
          action={<KnowledgeDialog onMutated={refreshItems} />}
        />
      )}
    </>
  );
}
