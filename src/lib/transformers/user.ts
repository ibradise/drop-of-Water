import { z } from "zod";
import { ROLES, ENTITY_TYPES } from "@/lib/enums";
import type { User } from "@/lib/schemas/user";

export const rawUserSchema = z.object({
  _id: z.string(),
  firebaseUid: z.string(),
  email: z.string().email(),
  name: z.string().min(2).max(120),
  phoneNumber: z.string().optional(),
  roles: z.array(z.enum(ROLES)),
  entityType: z.enum(ENTITY_TYPES).nullable().optional(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  isDeleted: z.boolean().optional(),
  profile: z.object({
    avatarUrl: z.string().url().optional(),
    bio: z.string().max(1000).optional(),
    location: z.string().max(200).optional(),
    organizationName: z.string().max(200).optional(),
    socialLinks: z.array(z.object({
      platform: z.string(),
      profileUrl: z.string().url(),
      isPrimary: z.boolean(),
    })).optional(),
  }).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export type RawUser = z.infer<typeof rawUserSchema>;

export function toUser(raw: RawUser): User {
  return {
    _id: raw._id,
    id: raw._id,
    firebaseUid: raw.firebaseUid,
    email: raw.email,
    name: raw.name,
    phoneNumber: raw.phoneNumber,
    roles: raw.roles,
    entityType: raw.entityType,
    isVerified: raw.isVerified,
    isActive: raw.isActive,
    isDeleted: raw.isDeleted,
    profile: raw.profile,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}