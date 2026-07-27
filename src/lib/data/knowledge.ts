import "server-only";

import { requireCurrentOrganizationOperator, ms } from "@/lib/data/auth";
import { optionalTrimmed, requiredTrimmed } from "@/lib/data/shared";

export type KnowledgeItem = {
  _id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
};

export async function listKnowledge(args: {
  includeUnpublished?: boolean;
} = {}): Promise<KnowledgeItem[]> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  let query = supabase
    .from("knowledge_items")
    .select("*")
    .eq("organization_id", organization.id)
    .limit(501);
  if (!args.includeUnpublished) query = query.eq("published", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if ((data ?? []).length > 500) {
    throw new Error("Knowledge item limit exceeded.");
  }
  return (data ?? [])
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      _id: item.id,
      title: item.title,
      content: item.content,
      category: item.category,
      published: item.published,
      sortOrder: item.sort_order,
      createdAt: ms(item.created_at)!,
      updatedAt: ms(item.updated_at)!,
    }));
}

export async function upsertKnowledge(args: {
  knowledgeItemId?: string;
  title: string;
  content: string;
  category?: string;
  published?: boolean;
  sortOrder?: number;
}): Promise<KnowledgeItem> {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const values = {
    title: requiredTrimmed(args.title, "title", 200),
    content: requiredTrimmed(args.content, "content", 20_000),
    category: optionalTrimmed(args.category, "category", 80) ?? "General",
    published: args.published ?? true,
    sort_order: args.sortOrder ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (args.knowledgeItemId) {
    const { data: existing } = await supabase
      .from("knowledge_items")
      .select("*")
      .eq("id", args.knowledgeItemId)
      .eq("organization_id", organization.id)
      .maybeSingle();
    if (!existing) {
      throw new Error("Knowledge item not found in this organization.");
    }
    const { data, error } = await supabase
      .from("knowledge_items")
      .update(values)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return {
      _id: data.id,
      title: data.title,
      content: data.content,
      category: data.category,
      published: data.published,
      sortOrder: data.sort_order,
      createdAt: ms(data.created_at)!,
      updatedAt: ms(data.updated_at)!,
    };
  }

  const { data, error } = await supabase
    .from("knowledge_items")
    .insert({
      organization_id: organization.id,
      ...values,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return {
    _id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    published: data.published,
    sortOrder: data.sort_order,
    createdAt: ms(data.created_at)!,
    updatedAt: ms(data.updated_at)!,
  };
}

export async function removeKnowledge(knowledgeItemId: string) {
  const { organization, supabase } = await requireCurrentOrganizationOperator();
  const { data: existing } = await supabase
    .from("knowledge_items")
    .select("id")
    .eq("id", knowledgeItemId)
    .eq("organization_id", organization.id)
    .maybeSingle();
  if (!existing) {
    throw new Error("Knowledge item not found in this organization.");
  }
  const { error } = await supabase
    .from("knowledge_items")
    .delete()
    .eq("id", existing.id);
  if (error) throw new Error(error.message);
  return null;
}
