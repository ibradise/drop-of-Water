import { z } from "zod";
import { api } from "@/lib/api/client";
import { notificationSchema, registerDeviceSchema } from "@/lib/schemas/notification";
import { toNotification, type RawNotification } from "@/lib/transformers/notification";

const notificationsArraySchema = z.array(notificationSchema);

export const notificationsApi = {
  mine: () =>
    api
      .get<RawNotification[]>("/notifications/me")
      .then((raw) => raw.map(toNotification))
      .then((list) => notificationsArraySchema.parse(list)),

  registerDevice: (token: string) => {
    const validated = registerDeviceSchema.parse({ token });
    return api.post<unknown>("/notifications/device-tokens", validated, { skipAuth: false });
  },

  unregisterDevice: (token: string) => {
    const validated = registerDeviceSchema.parse({ token });
    return api.delete<unknown>("/notifications/device-tokens", { body: validated });
  },
};