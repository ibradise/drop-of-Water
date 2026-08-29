import { z } from "zod";
import { ROLES, ENTITY_TYPES } from "@/lib/enums";

export const socialLinkSchema = z.object({
  platform: z.string().min(1),
  profileUrl: z.string().url(),
  isPrimary: z.boolean(),
});

export const profileSchema = z.object({
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  organizationName: z.string().max(200).optional(),
  socialLinks: z.array(socialLinkSchema).optional(),
});

export const userSchema = z.object({
  _id: z.string(),
  id: z.string(),
  firebaseUid: z.string(),
  email: z.string().email(),
  name: z.string().min(2).max(120),
  phoneNumber: z.string().optional(),
  roles: z.array(z.enum(ROLES)),
  entityType: z.enum(ENTITY_TYPES).nullable().optional(),
  isVerified: z.boolean(),
  isActive: z.boolean(),
  isDeleted: z.boolean().optional(),
  profile: profileSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const socialLinksOpSchema = z.object({
  add: z.array(socialLinkSchema).optional(),
  remove: z.array(z.number().int().nonnegative()).optional(),
});

export const registerUserSchema = z
  .object({
    name: z.string().min(2).max(120),
    phoneNumber: z.string().optional(),
    roles: z.array(z.enum(ROLES)).optional(),
    entityType: z.enum(ENTITY_TYPES).optional(),
    profile: profileSchema.optional(),
  })
  .strict();
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const updateMeSchema = z
  .object({
    name: z.string().min(2).max(120).optional(),
    phoneNumber: z.string().optional(),
    entityType: z.enum(ENTITY_TYPES).optional(),
    profile: profileSchema
      .extend({ socialLinks: socialLinksOpSchema.optional() })
      .partial()
      .optional(),
  })
  .strict();
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export const adminUpdateUserSchema = updateMeSchema.extend({
  roles: z.array(z.enum(ROLES)).optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  email: z.string().email().optional(),
});
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export const userListFiltersSchema = z.object({
  role: z.enum(ROLES).optional(),
  entityType: z.enum(ENTITY_TYPES).optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
export type UserListFilters = z.infer<typeof userListFiltersSchema>;
