import { api } from "@/lib/api/client";
import { paginatedSchema, type PaginationParams } from "@/lib/schemas/pagination";
import {
  certificateSchema,
  generateCertificateSchema,
  setCertificateVisibilitySchema,
  type GenerateCertificateInput,
  type SetCertificateVisibilityInput,
} from "@/lib/schemas/certificate";
import {
  toCertificate,
  toCertificateList,
  type RawPaginatedCertificate,
  type RawCertificate,
} from "@/lib/transformers/certificate";

const paginatedCertificate = paginatedSchema(certificateSchema);

export const certificatesApi = {
  mine: (params?: PaginationParams & { type?: "fundraising" | "volunteer_time"; includeSuperseded?: boolean }) =>
    api
      .get<RawPaginatedCertificate>("/certificates/me", { query: params as Record<string, unknown> | undefined })
      .then((raw) => toCertificateList(raw))
      .then((list) => paginatedCertificate.parse(list)),

  generate: (body: GenerateCertificateInput) => {
    const validated = generateCertificateSchema.parse(body);
    return api
      .post<RawCertificate>("/certificates/generate", validated)
      .then((raw) => toCertificate(raw))
      .then((c) => certificateSchema.parse(c));
  },

  byCode: (code: string) =>
    api
      .get<RawCertificate>(`/certificates/${code}`)
      .then((raw) => toCertificate(raw))
      .then((c) => certificateSchema.parse(c)),

  setVisibility: (id: string, body: SetCertificateVisibilityInput) => {
    const validated = setCertificateVisibilitySchema.parse(body);
    return api
      .patch<RawCertificate>(`/certificates/${id}/visibility`, validated)
      .then((raw) => toCertificate(raw))
      .then((c) => certificateSchema.parse(c));
  },
};