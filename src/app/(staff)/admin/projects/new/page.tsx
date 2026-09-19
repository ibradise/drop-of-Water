"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cloneElement, isValidElement, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { projectsApi } from "@/lib/api/projects";
import { type CreateProjectInput } from "@/lib/schemas/project";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    shortDescription: z.string().max(500).optional(),
    fullDescription: z.string().optional(),
    budget: z.number({ message: "Enter a valid budget" }).min(1, "Budget must be at least 1"),
    currency: z.string().length(3).optional(),
    beneficiaryCount: z.number().int().min(0).optional(),
    estimatedPeopleServed: z.number().int().min(0).optional(),
    gpsCoordinates: z.string().max(200).optional(),
    lat: z.string().optional(),
    lng: z.string().optional(),
    photosText: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.lat && v.lat.trim()) || (v.lng && v.lng.trim())) {
      const lat = Number(v.lat);
      const lng = Number(v.lng);
      if (!v.lat || !v.lng || Number.isNaN(lat) || Number.isNaN(lng)) {
        ctx.addIssue({
          path: ["lng"],
          code: z.ZodIssueCode.custom,
          message: "Both latitude and longitude are required when either is set",
        });
      } else if (lat < -90 || lat > 90) {
        ctx.addIssue({
          path: ["lat"],
          code: z.ZodIssueCode.custom,
          message: "Latitude must be between -90 and 90",
        });
      } else if (lng < -180 || lng > 180) {
        ctx.addIssue({
          path: ["lng"],
          code: z.ZodIssueCode.custom,
          message: "Longitude must be between -180 and 180",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function AdminNewProjectPage() {
  const router = useRouter();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      shortDescription: "",
      fullDescription: "",
      budget: undefined,
      currency: "ETB",
      beneficiaryCount: undefined,
      estimatedPeopleServed: undefined,
      gpsCoordinates: "",
      lat: "",
      lng: "",
      photosText: "",
    },
  });

  const create = useMutation({
    mutationFn: (values: FormValues) => {
      const photos =
        values.photosText
          ?.split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0) ?? [];
      const payload: CreateProjectInput = {
        title: values.title,
        shortDescription: values.shortDescription || undefined,
        fullDescription: values.fullDescription || undefined,
        budget: Math.round(values.budget * 100),
        currency: values.currency || "ETB",
        beneficiaryCount: values.beneficiaryCount,
        estimatedPeopleServed: values.estimatedPeopleServed,
        gpsCoordinates: values.gpsCoordinates || undefined,
        photos: photos.length > 0 ? photos : undefined,
        ...(values.lat && values.lng
          ? { location: { lat: Number(values.lat), lng: Number(values.lng) } }
          : {}),
      };
      return projectsApi.create(payload);
    },
    onSuccess: (project) => {
      toast.success("Your project was created as a draft. You can now add milestones, costs, and photos.");
      qc.invalidateQueries({ queryKey: ["admin", "projects"] });
      router.push(`/admin/projects/${project._id}/manage`);
    },
    onError: (err) => {
      console.error("Create project failed:", err);
      toast.error("We couldn't create this project. Please check your entries and try again.");
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/admin/projects" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to projects
      </Link>

      <header className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          New project
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">
          Create a water project
        </h2>
        <p className="text-sm text-slate-500">
          Projects start as a draft. Add milestones, costs, and photos after creation.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project details</CardTitle>
          <CardDescription>
            Budgets are entered in whole currency units and stored as the smallest unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="flex flex-col gap-4">
            <Field label="Title" error={errors.title?.message}>
              <input
                type="text"
                placeholder="e.g. Adama Primary School borehole"
                {...register("title")}
                className={inputCls(Boolean(errors.title))}
              />
            </Field>

            <Field label="Short description" error={errors.shortDescription?.message}>
              <input
                type="text"
                placeholder="One line for listings"
                {...register("shortDescription")}
                className={inputCls(Boolean(errors.shortDescription))}
              />
            </Field>

            <Field label="Full description" error={errors.fullDescription?.message}>
              <textarea
                rows={5}
                placeholder="The story, community need, and what the water will unlock."
                {...register("fullDescription")}
                className={inputCls(Boolean(errors.fullDescription))}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Budget" error={errors.budget?.message}>
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 250000"
                  {...register("budget", { valueAsNumber: true })}
                  className={inputCls(Boolean(errors.budget))}
                />
              </Field>
              <Field label="Currency" error={errors.currency?.message}>
                <select
                  {...register("currency")}
                  className={inputCls(Boolean(errors.currency))}
                  defaultValue="ETB"
                >
                  <option value="ETB">ETB — Ethiopian Birr</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Beneficiary count" error={errors.beneficiaryCount?.message}>
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Optional"
                  {...register("beneficiaryCount", { valueAsNumber: true })}
                  className={inputCls(Boolean(errors.beneficiaryCount))}
                />
              </Field>
              <Field
                label="Estimated people served"
                error={errors.estimatedPeopleServed?.message}
              >
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Optional"
                  {...register("estimatedPeopleServed", { valueAsNumber: true })}
                  className={inputCls(Boolean(errors.estimatedPeopleServed))}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-1">
                <Field label="Latitude" error={errors.lat?.message}>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 8.98"
                    {...register("lat")}
                    className={inputCls(Boolean(errors.lat))}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Longitude" error={errors.lng?.message}>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 38.75"
                    {...register("lng")}
                    className={inputCls(Boolean(errors.lng))}
                  />
                </Field>
              </div>
            </div>

            <Field label="GPS coordinates" error={errors.gpsCoordinates?.message}>
              <input
                type="text"
                placeholder="Text location reference (optional)"
                {...register("gpsCoordinates")}
                className={inputCls(Boolean(errors.gpsCoordinates))}
              />
            </Field>

            <Field label="Photo URLs (one per line)" error={errors.photosText?.message}>
              <textarea
                rows={3}
                placeholder="https://images.example.com/well.jpg"
                {...register("photosText")}
                className={inputCls(Boolean(errors.photosText))}
              />
            </Field>

            <div className="flex items-center gap-2">
              <Link href="/admin/projects">
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" size="lg" isLoading={create.isPending}>
                Create project
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<{ id?: string }>, { id })
    : children;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {control}
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full rounded-lg border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
    hasError
      ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/30"
      : "border-slate-200 focus:border-sky-500 focus:ring-sky-500/30"
  }`;
}