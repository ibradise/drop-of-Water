import { z } from "zod";
import { PROJECT_STATUSES } from "@/lib/enums";

export const costItemSchema = z.object({
  _id: z.string().optional(),
  item: z.string().min(1).max(200),
  amount: z.number().int().min(0),
});
export type CostItem = z.infer<typeof costItemSchema>;

export const milestoneSchema = z.object({
  _id: z.string().optional(),
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  status: z.string().default("pending"),
  completedAt: z.string().nullable().optional(),
  verifiedBy: z.string().nullable().optional(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const proofOfImpactSchema = z.object({
  _id: z.string().optional(),
  type: z.string().min(1).max(50),
  url: z.string().url(),
  uploadedBy: z.string().optional(),
  date: z.string().optional(),
});
export type ProofOfImpact = z.infer<typeof proofOfImpactSchema>;

export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const projectSchema = z.object({
  _id: z.string(),
  title: z.string().max(200),
  shortDescription: z.string().max(500).optional(),
  fullDescription: z.string().optional(),
  location: locationSchema.optional(),
  gpsCoordinates: z.string().max(200).optional(),
  budget: z.number().int().min(0),
  currency: z.string().length(3),
  currentFunding: z.number().int().min(0),
  costBreakdown: z.array(costItemSchema),
  beneficiaryCount: z.number().int().min(0).optional(),
  estimatedPeopleServed: z.number().int().min(0).optional(),
  status: z.enum(PROJECT_STATUSES),
  milestones: z.array(milestoneSchema),
  photos: z.array(z.string().url()),
  proofOfImpact: z.array(proofOfImpactSchema),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectSchema = z
  .object({
    title: z.string().min(1).max(200),
    shortDescription: z.string().max(500).optional(),
    fullDescription: z.string().optional(),
    location: locationSchema.optional(),
    gpsCoordinates: z.string().max(200).optional(),
    budget: z.number().int().min(0),
    currency: z.string().length(3).optional(),
    beneficiaryCount: z.number().int().min(0).optional(),
    estimatedPeopleServed: z.number().int().min(0).optional(),
    costBreakdown: z.array(costItemSchema).optional(),
    photos: z.array(z.string().url()).optional(),
  })
  .strict();
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.partial();
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
