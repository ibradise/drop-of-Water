"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import { usersApi } from "@/lib/api/users";
import type { RegisterUserInput } from "@/lib/schemas/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITY_TYPES } from "@/lib/enums";

const socialLinkRegex = /^https?:\/\//i;

const profileFormSchema = z.object({
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  organizationName: z.string().max(200).optional(),
  socialPlatform: z.string().optional(),
  socialUrl: z
    .string()
    .optional()
    .refine((v) => !v || socialLinkRegex.test(v), "Must be a valid URL"),
});

const formSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(120),
    phoneNumber: z.string().optional(),
    entityType: z.enum(ENTITY_TYPES).optional(),
    profile: profileFormSchema.optional(),
  })
  .superRefine((v, ctx) => {
    const p = v.profile;
    if (!p) return;
    if ((p.socialPlatform && !p.socialUrl) || (!p.socialPlatform && p.socialUrl)) {
      ctx.addIssue({
        path: ["profile", "socialUrl"],
        code: z.ZodIssueCode.custom,
        message: "Provide both a platform and a URL",
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function OnboardingPage() {
  const router = useRouter();
  const { state, signOut, refreshDowProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace("/sign-in?next=/onboarding");
    } else if (state.status === "authenticated") {
      router.replace("/me");
    }
  }, [state, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      entityType: undefined,
      profile: {
        bio: "",
        location: "",
        organizationName: "",
        socialPlatform: "",
        socialUrl: "",
      },
    },
  });

  if (state.status === "loading" || state.status === "authenticated" || state.status === "unauthenticated") {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const payload: RegisterUserInput = {
        name: values.name,
        phoneNumber: values.phoneNumber || undefined,
        entityType: values.entityType,
        profile: values.profile
          ? {
              bio: values.profile.bio || undefined,
              location: values.profile.location || undefined,
              organizationName: values.profile.organizationName || undefined,
              socialLinks:
                values.profile.socialPlatform && values.profile.socialUrl
                  ? [
                      {
                        platform: values.profile.socialPlatform,
                        profileUrl: values.profile.socialUrl,
                        isPrimary: true,
                      },
                    ]
                  : undefined,
            }
          : undefined,
      };
      await usersApi.register(payload);
      // Refresh the auth context so we flip from `needs-onboarding` to `authenticated`.
      await refreshDowProfile();
      toast.success("Welcome to Drop of Water.");
      router.push("/me");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create your profile.";
      toast.error(message);
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome aboard</h1>
        <p className="text-slate-600">
          Tell us a bit about yourself. You can update all of this later.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your basics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                {...register("name")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {errors.name ? (
                <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="phoneNumber" className="mb-1 block text-sm font-medium text-slate-700">
                Phone (optional)
              </label>
              <input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                {...register("phoneNumber")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="entityType" className="mb-1 block text-sm font-medium text-slate-700">
                I am a…
              </label>
              <select
                id="entityType"
                {...register("entityType")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="">Select…</option>
                {ENTITY_TYPES.map((e) => (
                  <option key={e} value={e}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile (optional)</CardTitle>
            <CardDescription>These are public on your donor list entries.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="location" className="mb-1 block text-sm font-medium text-slate-700">
                Location
              </label>
              <input
                id="location"
                type="text"
                {...register("profile.location")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="organizationName" className="mb-1 block text-sm font-medium text-slate-700">
                Organization
              </label>
              <input
                id="organizationName"
                type="text"
                {...register("profile.organizationName")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bio" className="mb-1 block text-sm font-medium text-slate-700">
                Short bio
              </label>
              <textarea
                id="bio"
                rows={3}
                {...register("profile.bio")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="socialPlatform" className="mb-1 block text-sm font-medium text-slate-700">
                Social platform
              </label>
              <input
                id="socialPlatform"
                type="text"
                placeholder="instagram, x, linkedin…"
                {...register("profile.socialPlatform")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label htmlFor="socialUrl" className="mb-1 block text-sm font-medium text-slate-700">
                Profile URL
              </label>
              <input
                id="socialUrl"
                type="url"
                placeholder="https://…"
                {...register("profile.socialUrl")}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              {errors.profile?.socialUrl ? (
                <p className="mt-1 text-xs text-rose-600">{errors.profile.socialUrl.message}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Sign out
          </button>
          <Button type="submit" size="lg" isLoading={submitting}>
            Create my profile
          </Button>
        </div>
      </form>
    </div>
  );
}
