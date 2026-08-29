import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams, type Paginated } from "@/lib/schemas/pagination";
import {
  certificateSchema,
  generateCertificateSchema,
  setCertificateVisibilitySchema,
  type Certificate,
  type GenerateCertificateInput,
  type SetCertificateVisibilityInput,
} from "@/lib/schemas/certificate";

const paginatedCertificate = paginatedSchema(certificateSchema);

export const certificatesApi = {
  mine: (params?: PaginationParams & { type?: "fundraising" | "volunteer_time"; includeSuperseded?: boolean }) =>
    api
      .get<unknown>("/certificates/me", { query: params as Record<string, unknown> | undefined })
      .then((data) => paginatedCertificate.parse(data) as Paginated<Certificate>),

  generate: (body: GenerateCertificateInput) => {
    const validated = generateCertificateSchema.parse(body);
    return api
      .post<Certificate>("/certificates/generate", validated)
      .then((c) => certificateSchema.parse(c));
  },

  byCode: (code: string) =>
    api.get<Certificate>(`/certificates/${code}`).then((c) => certificateSchema.parse(c)),

  setVisibility: (id: string, body: SetCertificateVisibilityInput) => {
    const validated = setCertificateVisibilitySchema.parse(body);
    return api.patch<Certificate>(`/certificates/${id}/visibility`, validated);
  },
};
