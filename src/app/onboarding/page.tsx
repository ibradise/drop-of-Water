"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Building2, Globe, MapPin, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { getSafeNext } from "@/lib/safe-next";
import { usersApi } from "@/lib/api/users";
import type { RegisterUserInput } from "@/lib/schemas/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ENTITY_TYPES } from "@/lib/enums";

const profileFormSchema = z.object({
  bio: z.string().max(1000).optional(),
  location: z.string().max(200).optional(),
  organizationName: z.string().max(200).optional(),
  socialPlatform: z.string().optional(),
  socialUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Must be a valid URL"),
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
  return (
    <Suspense fallback={<OnboardingSkeleton />}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = getSafeNext(search.get("next"));
  const { state, signOut, refreshDowProfile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.status === "unauthenticated") {
      router.replace(`/sign-in?next=${encodeURIComponent(next)}`);
    } else if (state.status === "authenticated") {
      router.replace(next);
    }
  }, [state, router, next]);

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
    return <OnboardingSkeleton />;
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
      await refreshDowProfile();
      toast.success("Welcome to Drop of Water.");
      router.push(next);
    } catch (err) {
      console.error("Create profile failed:", err);
      toast.error("We couldn't create your profile. Please check your entries and try again.");
      setSubmitting(false);
    }
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          One last step
        </span>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900">
          Welcome aboard
        </h1>
        <p className="text-slate-600">
          Tell us a bit about yourself. You can update all of this later.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Your basics</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                {...register("name")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              {errors.name ? (
                <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="phoneNumber"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Phone (optional)
              </label>
              <input
                id="phoneNumber"
                type="tel"
                autoComplete="tel"
                {...register("phoneNumber")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
              {errors.phoneNumber ? (
                <p className="mt-1 text-xs text-rose-600">{errors.phoneNumber.message}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="entityType"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                I am a…
              </label>
              <select
                id="entityType"
                {...register("entityType")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <option value="">Select…</option>
                {ENTITY_TYPES.map((e) => (
                  <option key={e} value={e}>
                    {e.charAt(0).toUpperCase() + e.slice(1)}
                  </option>
                ))}
              </select>
              {errors.entityType ? (
                <p className="mt-1 text-xs text-rose-600">{errors.entityType.message}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Profile (optional)</CardTitle>
            </div>
            <CardDescription>
              These are public on your donor list entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="location"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Location
              </label>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="location"
                  type="text"
                  autoComplete="address-level2"
                  {...register("profile.location")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="organizationName"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Organization
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="organizationName"
                  type="text"
                  autoComplete="organization"
                  {...register("profile.organizationName")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="bio" className="mb-1 block text-sm font-medium text-slate-700">
                Short bio
              </label>
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
                <textarea
                  id="bio"
                  rows={3}
                  {...register("profile.bio")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
            </div>
            <div>
              <label
                htmlFor="socialPlatform"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Social platform
              </label>
              <input
                id="socialPlatform"
                type="text"
                placeholder="instagram, x, linkedin…"
                {...register("profile.socialPlatform")}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              />
            </div>
            <div>
              <label
                htmlFor="socialUrl"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Profile URL
              </label>
              <div className="relative">
                <Globe className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="socialUrl"
                  type="url"
                  placeholder="https://…"
                  {...register("profile.socialUrl")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
              {errors.profile?.socialUrl ? (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.profile.socialUrl.message}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => signOut()}>
            Sign out
          </Button>
          <Button type="submit" size="lg" isLoading={submitting}>
            Create my profile
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
