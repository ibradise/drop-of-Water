import { z } from "zod";

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.string()).optional(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationItem = z.infer<typeof notificationSchema>;

export const registerDeviceSchema = z.object({
  token: z.string().min(1).max(4096),
});
export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;