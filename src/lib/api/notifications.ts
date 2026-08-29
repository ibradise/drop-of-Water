import { z } from "zod";
import { api } from "@/lib/api/client";

export const notificationSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  data: z.record(z.string(), z.string()).optional(),
  read: z.boolean(),
  createdAt: z.string(),
});
export type NotificationItem = z.infer<typeof notificationSchema>;

const tokenSchema = z.object({ token: z.string().min(1).max(4096) });

export const notificationsApi = {
  mine: () =>
    api.get<unknown>("/notifications/me").then((data) => z.array(notificationSchema).parse(data)),

  registerDevice: (token: string) => {
    const validated = tokenSchema.parse({ token });
    return api.post<unknown>("/notifications/device-tokens", validated, { skipAuth: false });
  },

  unregisterDevice: (token: string) => {
    const validated = tokenSchema.parse({ token });
    return api.delete<unknown>("/notifications/device-tokens", { body: validated });
  },
};
