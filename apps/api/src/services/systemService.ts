import type { SystemSummary, CreateSystemInput, UpdateSystemInput } from "@purgatory/shared";
import { CreateSystemInputSchema, UpdateSystemInputSchema } from "@purgatory/shared";
import { listSampleSystems, getSampleSystemBySlug } from "@purgatory/scenarios";
import type { ManualSystemRecord, SystemRepository } from "./systemRepository.js";

export type ServiceFailure = { ok: false; status: number; error: string; message: string };
export type ServiceResult<T> = { ok: true; result: T } | ServiceFailure;

const notFound: ServiceFailure = {
  ok: false,
  status: 404,
  error: "system_not_found",
  message: "No system matches this id.",
};
const forbidden: ServiceFailure = {
  ok: false,
  status: 403,
  error: "forbidden",
  message: "Sample systems cannot be modified.",
};
const badRequest = (message: string): ServiceFailure => ({ ok: false, status: 400, error: "invalid_request", message });

function toSummary(record: ManualSystemRecord): SystemSummary {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    description: record.description,
    sourceType: "manual",
    visibility: "private",
    ownerUserId: record.ownerUserId,
    componentCount: 0,
    scenarioCount: 0,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listSystems(repo: SystemRepository, userId: string): Promise<SystemSummary[]> {
  const owned = await repo.listUserSystems(userId);
  return [...listSampleSystems(), ...owned.map(toSummary)];
}

// Sample systems are readable by anyone; a manual system is readable only
// by its owner - looked up by id (not slug, since manual slugs are only
// unique per-owner and sample lookups use their fixed slug as their id).
export async function getSystem(repo: SystemRepository, userId: string, systemId: string): Promise<ServiceResult<SystemSummary>> {
  const sample = getSampleSystemBySlug(systemId);
  if (sample) return { ok: true, result: sample };

  const manual = await repo.getSystem(systemId);
  if (!manual) return notFound;
  if (manual.ownerUserId !== userId) return notFound;
  return { ok: true, result: toSummary(manual) };
}

export async function createSystem(repo: SystemRepository, userId: string, body: unknown): Promise<ServiceResult<SystemSummary>> {
  const parsed = CreateSystemInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid system input.");
  const input: CreateSystemInput = parsed.data;
  const created = await repo.createSystem(userId, input);
  return { ok: true, result: toSummary(created) };
}

export async function updateSystem(
  repo: SystemRepository,
  userId: string,
  systemId: string,
  body: unknown,
): Promise<ServiceResult<SystemSummary>> {
  if (getSampleSystemBySlug(systemId)) return forbidden;

  const existing = await repo.getSystem(systemId);
  if (!existing || existing.ownerUserId !== userId) return notFound;

  const parsed = UpdateSystemInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.issues[0]?.message ?? "Invalid system input.");
  const patch: UpdateSystemInput = parsed.data;

  const updated = await repo.updateSystem(systemId, patch);
  return { ok: true, result: toSummary(updated) };
}
