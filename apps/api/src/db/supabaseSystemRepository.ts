import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateSystemInput, UpdateSystemInput } from "@purgatory/shared";
import { slugifySystemName, type ManualSystemRecord, type SystemRepository } from "../services/systemRepository.js";

interface SystemRow {
  id: string;
  owner_user_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

function toSystem(row: SystemRow): ManualSystemRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSystemRepository implements SystemRepository {
  constructor(private readonly client: SupabaseClient) {}

  async createSystem(userId: string, input: CreateSystemInput): Promise<ManualSystemRecord> {
    const base = slugifySystemName(input.name);
    const { data: existing, error: listError } = await this.client
      .from("systems")
      .select("slug")
      .eq("owner_user_id", userId);
    if (listError) throw listError;
    const existingSlugs = new Set((existing ?? []).map((row: { slug: string }) => row.slug));
    let slug = base;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }

    const { data, error } = await this.client
      .from("systems")
      .insert({ owner_user_id: userId, name: input.name, slug, description: input.description ?? null })
      .select()
      .single();
    if (error) throw error;
    return toSystem(data as SystemRow);
  }

  async getSystem(id: string): Promise<ManualSystemRecord | undefined> {
    const { data, error } = await this.client.from("systems").select().eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? toSystem(data as SystemRow) : undefined;
  }

  async listUserSystems(userId: string): Promise<ManualSystemRecord[]> {
    const { data, error } = await this.client
      .from("systems")
      .select()
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row: SystemRow) => toSystem(row));
  }

  async updateSystem(id: string, patch: UpdateSystemInput): Promise<ManualSystemRecord> {
    const { data, error } = await this.client
      .from("systems")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return toSystem(data as SystemRow);
  }
}
