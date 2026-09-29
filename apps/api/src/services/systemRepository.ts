import { randomUUID } from "node:crypto";
import type { CreateSystemInput, UpdateSystemInput } from "@purgatory/shared";

// Manual (user-created) systems only - sample systems never live here (see
// packages/scenarios/src/sampleSystems.ts). systemService.ts merges both
// into the one SystemSummary projection the frontend/API see.
export interface ManualSystemRecord {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// Deliberately not globally unique (see the systems_owner_user_id_slug_idx
// migration) - only used to make manual systems referenceable by a
// readable slug within one owner's own list.
export function slugifySystemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "system";
}

export interface SystemRepository {
  createSystem(userId: string, input: CreateSystemInput): Promise<ManualSystemRecord>;
  getSystem(id: string): Promise<ManualSystemRecord | undefined>;
  listUserSystems(userId: string): Promise<ManualSystemRecord[]>;
  updateSystem(id: string, patch: UpdateSystemInput): Promise<ManualSystemRecord>;
}

// In-process only, lost on restart - same fallback role as
// InMemoryReviewRepository (production fallback when Supabase isn't
// configured, always used by tests).
export class InMemorySystemRepository implements SystemRepository {
  private systems = new Map<string, ManualSystemRecord>();

  async createSystem(userId: string, input: CreateSystemInput): Promise<ManualSystemRecord> {
    const now = new Date().toISOString();
    const base = slugifySystemName(input.name);
    const existingSlugs = new Set([...this.systems.values()].filter((s) => s.ownerUserId === userId).map((s) => s.slug));
    let slug = base;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${suffix}`;
      suffix += 1;
    }
    const system: ManualSystemRecord = {
      id: randomUUID(),
      ownerUserId: userId,
      name: input.name,
      slug,
      description: input.description,
      createdAt: now,
      updatedAt: now,
    };
    this.systems.set(system.id, system);
    return system;
  }

  async getSystem(id: string): Promise<ManualSystemRecord | undefined> {
    return this.systems.get(id);
  }

  async listUserSystems(userId: string): Promise<ManualSystemRecord[]> {
    return [...this.systems.values()]
      .filter((s) => s.ownerUserId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateSystem(id: string, patch: UpdateSystemInput): Promise<ManualSystemRecord> {
    const existing = this.systems.get(id);
    if (!existing) throw new Error(`System ${id} does not exist.`);
    const updated: ManualSystemRecord = { ...existing, ...patch, updatedAt: new Date().toISOString() };
    this.systems.set(id, updated);
    return updated;
  }
}
