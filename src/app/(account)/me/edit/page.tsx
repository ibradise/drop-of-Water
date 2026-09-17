"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cloneElement, isValidElement, useEffect, useId } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import { usersApi } from "@/lib/api/users";
import { ApiError } from "@/lib/api/client";
import { ENTITY_TYPES } from "@/lib/enums";
import { type UpdateMeInput } from "@/lib/schemas/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  name: z.string().min(2, "At least 2 characters").max(120),
  phoneNumber: z.string().optional(),
  entityType: z.enum(ENTITY_TYPES).optional(),
  avatarUrl: z
    .string()
    .url("Enter a valid URL, or leave blank")
    .optional()
    .or(z.literal("")),
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  organizationName: z.string().max(200).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditProfilePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { state } = useAuth();

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace("/sign-in?next=/me/edit");
    }
  }, [state, router]);

  const meQ = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => usersApi.me(),
    enabled: state.status === "authenticated",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      entityType: "individual",
      avatarUrl: "",
      bio: "",
      location: "",
      organizationName: "",
    },
  });

  useEffect(() => {
    if (!meQ.data) return;
    const u = meQ.data;
    reset({
      name: u.name,
      phoneNumber: u.phoneNumber ?? "",
      entityType: u.entityType ?? "individual",
      avatarUrl: u.profile?.avatarUrl ?? "",
      bio: u.profile?.bio ?? "",
      location: u.profile?.location ?? "",
      organizationName: u.profile?.organizationName ?? "",
    });
  }, [meQ.data, reset]);

  const save = useMutation({
    mutationFn: (values: FormValues) => {
      const payload: UpdateMeInput = {
        name: values.name,
        phoneNumber: values.phoneNumber || undefined,
        entityType: values.entityType,
        profile: {
          avatarUrl: values.avatarUrl || undefined,
          bio: values.bio || undefined,
          location: values.location || undefined,
          organizationName: values.organizationName || undefined,
        },
      };
      return usersApi.updateMe(payload);
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      qc.invalidateQueries({ queryKey: ["users", "me"] });
      router.push("/me");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.messages[0] : "Couldn't save your profile.");
    },
  });

  if (meQ.isLoading) {
    return <div className="text-sm text-slate-500">Loading your profile…</div>;
  }

  if (!meQ.data) {
    return <div className="text-sm text-slate-500">Could not load your profile.</div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/me" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to my profile
      </Link>
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Edit profile</h2>
        <p className="text-slate-600">
          Your profile is shown to chapter leaders and program staff. Roles are granted by an
          administrator and cannot be changed here.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your details</CardTitle>
          <CardDescription>Leave a field blank to keep it empty.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="flex flex-col gap-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" error={errors.name?.message}>
                <input
                  type="text"
                  autoComplete="name"
                  {...register("name")}
                  className={inputCls(Boolean(errors.name))}
                />
              </Field>
              <Field label="Phone number" error={errors.phoneNumber?.message}>
                <input
                  type="text"
                  autoComplete="tel"
                  placeholder="Optional"
                  {...register("phoneNumber")}
                  className={inputCls(Boolean(errors.phoneNumber))}
                />
              </Field>
            </div>

            <Field label="Entity type" error={errors.entityType?.message}>
              <select
                {...register("entityType")}
                className={inputCls(Boolean(errors.entityType))}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Avatar URL" error={errors.avatarUrl?.message}>
              <input
                type="text"
                placeholder="https://…"
                {...register("avatarUrl")}
                className={inputCls(Boolean(errors.avatarUrl))}
              />
            </Field>

            <Field label="Organization" error={errors.organizationName?.message}>
              <input
                type="text"
                autoComplete="organization"
                placeholder="Optional"
                {...register("organizationName")}
                className={inputCls(Boolean(errors.organizationName))}
              />
            </Field>

            <Field label="Location" error={errors.location?.message}>
              <input
                type="text"
                autoComplete="address-level2"
                placeholder="Optional"
                {...register("location")}
                className={inputCls(Boolean(errors.location))}
              />
            </Field>

            <Field label="Bio" error={errors.bio?.message}>
              <textarea
                rows={4}
                placeholder="A short summary of who you are."
                {...register("bio")}
                className={inputCls(Boolean(errors.bio))}
              />
            </Field>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                size="lg"
                isLoading={save.isPending}
                disabled={!isDirty}
                className="self-start"
              >
                Save profile
              </Button>
              <Link href="/me">
                <Button type="button" variant="ghost" size="lg">
                  Cancel
                </Button>
              </Link>
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