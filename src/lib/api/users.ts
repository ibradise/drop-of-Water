import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  userSchema,
  userListFiltersSchema,
  type User,
  type RegisterUserInput,
  type UpdateMeInput,
  type AdminUpdateUserInput,
} from "@/lib/schemas/user";

const paginatedUser = paginatedSchema(userSchema);

export const usersApi = {
  register: (body: RegisterUserInput) =>
    api.post<User>("/users", body, { skipAuth: true }).then((u) => userSchema.parse(u)),
  me: () => api.get<User>("/users/me").then((u) => userSchema.parse(u)),
  updateMe: (body: UpdateMeInput) =>
    api.patch<User>("/users/me", body).then((u) => userSchema.parse(u)),
  list: (params: PaginationParams & Partial<ReturnType<typeof userListFiltersSchema.parse>>) => {
    const validated = userListFiltersSchema.parse(params);
    return api
      .get<unknown>("/users", { query: validated as Record<string, unknown> })
      .then((data) => paginatedUser.parse(data) as Paginated<User>);
  },
  get: (id: string) => api.get<User>(`/users/${id}`).then((u) => userSchema.parse(u)),
  adminUpdate: (id: string, body: AdminUpdateUserInput) =>
    api.patch<User>(`/users/${id}`, body).then((u) => userSchema.parse(u)),
  remove: (id: string) => api.delete<unknown>(`/users/${id}`),
};
