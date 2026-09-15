import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/enums";
import type { Project } from "@/lib/schemas/project";

export const rawProjectSchema = z.object({
  _id: z.string(),
  title: z.string().max(200),
  shortDescription: z.string().max(500).optional(),
  fullDescription: z.string().optional(),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable().optional(),
  gpsCoordinates: z.string().max(200).optional(),
  budget: z.union([z.number(), z.string()]),
  currency: z.string().length(3),
  currentFunding: z.union([z.number(), z.string()]),
  costBreakdown: z.array(z.object({
    _id: z.string().optional(),
    item: z.string().min(1).max(200),
    amount: z.number().int().min(0),
  })),
  beneficiaryCount: z.number().int().min(0).optional(),
  estimatedPeopleServed: z.number().int().min(0).optional(),
  status: z.enum(PROJECT_STATUSES),
  milestones: z.array(z.object({
    _id: z.string().optional(),
    title: z.string().min(3).max(200),
    description: z.string().max(2000).optional(),
    status: z.string().default("pending"),
    completedAt: z.string().nullable().optional(),
    verifiedBy: z.string().nullable().optional(),
  })),
  photos: z.array(z.string().url()),
  proofOfImpact: z.array(z.object({
    _id: z.string().optional(),
    type: z.string().min(1).max(50),
    url: z.string().url(),
    uploadedBy: z.string().optional(),
    date: z.string().optional(),
  })),
  deletedAt: z.string().nullable().optional(),
  createdBy: z.union([
    z.string(),
    z.object({ _id: z.string(), email: z.string(), name: z.string(), roles: z.array(z.string()), id: z.string() }),
  ]),
  updatedBy: z.union([z.string(), z.object({ _id: z.string() }), z.null()]).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();
export type RawProject = z.infer<typeof rawProjectSchema>;

export const rawPaginatedProjectSchema = z.object({
  data: z.array(rawProjectSchema),
  meta: z.object({
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    totalPages: z.number().int().min(0),
    hasNextPage: z.boolean(),
    hasPrevPage: z.boolean(),
  }),
});

export type RawPaginatedProject = z.infer<typeof rawPaginatedProjectSchema>;

function toNumber(v: number | string): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

export function toProject(raw: RawProject): Project {
  return {
    _id: raw._id,
    title: raw.title,
    shortDescription: raw.shortDescription,
    fullDescription: raw.fullDescription,
    location: raw.location ?? null,
    gpsCoordinates: raw.gpsCoordinates,
    budget: toNumber(raw.budget),
    currency: raw.currency,
    currentFunding: toNumber(raw.currentFunding),
    costBreakdown: raw.costBreakdown,
    beneficiaryCount: raw.beneficiaryCount,
    estimatedPeopleServed: raw.estimatedPeopleServed,
    status: raw.status,
    milestones: raw.milestones,
    photos: raw.photos,
    proofOfImpact: raw.proofOfImpact,
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : raw.createdBy._id,
    updatedBy: raw.updatedBy ? (typeof raw.updatedBy === 'string' ? raw.updatedBy : raw.updatedBy._id) : null,
    deletedAt: raw.deletedAt ?? null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export function toProjectList(raw: RawPaginatedProject) {
  return {
    data: raw.data.map(toProject),
    meta: raw.meta,
  };
}