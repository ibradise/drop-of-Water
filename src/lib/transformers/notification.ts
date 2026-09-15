import { z } from "zod";
import type { NotificationItem } from "@/lib/schemas/notification";

export const rawNotificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.string()).optional(),
  read: z.boolean(),
  createdAt: z.string(),
}).passthrough();

export type RawNotification = z.infer<typeof rawNotificationSchema>;

export function toNotification(raw: RawNotification): NotificationItem {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    data: raw.data,
    read: raw.read,
    createdAt: raw.createdAt,
  };
}