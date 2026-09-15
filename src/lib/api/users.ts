import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  userSchema,
  userListFiltersSchema,
  registerUserSchema,
  updateMeSchema,
  adminUpdateUserSchema,
  type User,
  type UserListFilters,
  type RegisterUserInput,
  type UpdateMeInput,
  type AdminUpdateUserInput,
} from "@/lib/schemas/user";
import { toUser, type RawUser } from "@/lib/transformers/user";

const paginatedUser = paginatedSchema(userSchema);

export const usersApi = {
  register: (body: RegisterUserInput) => {
    const validated = registerUserSchema.parse(body);
    return api
      .post<RawUser>("/users", validated)
      .then((raw) => toUser(raw))
      .then((u) => userSchema.parse(u));
  },

  me: () =>
    api
      .get<RawUser>("/users/me")
      .then((raw) => toUser(raw))
      .then((u) => userSchema.parse(u)),

  updateMe: (body: UpdateMeInput) => {
    const validated = updateMeSchema.parse(body);
    return api
      .patch<RawUser>("/users/me", validated)
      .then((raw) => toUser(raw))
      .then((u) => userSchema.parse(u));
  },

  list: (params: PaginationParams & Partial<UserListFilters>) => {
    const validated = userListFiltersSchema.parse(params);
    return api
      .get<unknown>("/users", { query: validated as Record<string, unknown> })
      .then((data) => paginatedUser.parse(data) as Paginated<User>);
  },

  get: (id: string) =>
    api
      .get<RawUser>(`/users/${id}`)
      .then((raw) => toUser(raw))
      .then((u) => userSchema.parse(u)),

  adminUpdate: (id: string, body: AdminUpdateUserInput) => {
    const validated = adminUpdateUserSchema.parse(body);
    return api
      .patch<RawUser>(`/users/${id}`, validated)
      .then((raw) => toUser(raw))
      .then((u) => userSchema.parse(u));
  },

  remove: (id: string) => api.delete(`/users/${id}`),
};