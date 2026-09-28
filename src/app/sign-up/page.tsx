"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { getSafeNext } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const schema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match",
  });
type Values = z.infer<typeof schema>;

export default function SignUpPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <SignUpInner />
    </Suspense>
  );
}

function AuthSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function SignUpInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = getSafeNext(search.get("next"));
  const { state, signUpWithEmail } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.status === "authenticated") {
      router.replace(next);
    } else if (state.status === "needs-onboarding") {
      router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
    }
  }, [state, router, next]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", confirm: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await signUpWithEmail(values.email, values.password);
      router.push(`/onboarding?next=${encodeURIComponent(next)}`);
    } catch (err) {
      console.error("Sign up failed:", err);
      toast.error("We couldn't create your account. This email may already be in use — try signing in, or try a different email.");
      setSubmitting(false);
    }
  });

  if (state.status !== "unauthenticated") {
    return <AuthSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Join us
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="text-slate-600">
          Sign up with email. We&rsquo;ll ask a few quick questions to set up
          your profile.
        </p>
      </header>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
              {errors.email ? (
                <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  {...register("password")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="mt-1 text-xs text-rose-600">{errors.password.message}</p>
              ) : null}
            </div>
            <div>
              <label
                htmlFor="confirm"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  {...register("confirm")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
              </div>
              {errors.confirm ? (
                <p className="mt-1 text-xs text-rose-600">{errors.confirm.message}</p>
              ) : null}
            </div>
            <Button type="submit" size="lg" isLoading={submitting}>
              <User className="h-4 w-4" />
              Create account
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-sky-700 hover:text-sky-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
