"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { getSafeNext } from "@/lib/safe-next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type Values = z.infer<typeof schema>;

export default function SignInPage() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <SignInInner />
    </Suspense>
  );
}

function AuthSkeleton() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-slate-100" />
      <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}

function SignInInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = getSafeNext(search.get("next"));
  const { state, signInWithEmail, signInWithGoogle, devSignIn, isMockMode } = useAuth();
  const [submitting, setSubmitting] = useState<null | "email" | "google">(null);
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
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting("email");
    try {
      await signInWithEmail(values.email, values.password);
      router.push(next);
    } catch (err) {
      console.error("Sign in failed:", err);
      toast.error("We couldn't sign you in. Please check your email and password and try again.");
      setSubmitting(null);
    }
  });

  const onGoogle = async () => {
    setSubmitting("google");
    try {
      await signInWithGoogle();
      router.push(next);
    } catch (err) {
      console.error("Google sign in failed:", err);
      toast.error("We couldn't sign you in with Google. Please try again.");
      setSubmitting(null);
    }
  };

  const onDevSignIn = async (mode: "anon" | "meron") => {
    setSubmitting("email");
    try {
      await devSignIn(mode);
      router.push(next);
    } catch (err) {
      console.error("Demo sign in failed:", err);
      toast.error("We couldn't sign you in. Please try again.");
      setSubmitting(null);
    }
  };

  if (state.status !== "unauthenticated") {
    return <AuthSkeleton />;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <header className="flex flex-col gap-2 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          Welcome back
        </span>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sign in</h1>
        <p className="text-slate-600">Welcome back. Sign in to manage your giving.</p>
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
                  autoComplete="current-password"
                  placeholder="••••••••"
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
            <Button type="submit" size="lg" isLoading={submitting === "email"}>
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 text-xs text-slate-500">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        onClick={onGoogle}
        isLoading={submitting === "google"}
      >
        Continue with Google
      </Button>

      {isMockMode ? (
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-slate-500" />
              <CardTitle className="text-base">Demo sign-in</CardTitle>
            </div>
            <CardDescription>
              Quick sign-in with a local test identity. No password needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              onClick={() => onDevSignIn("meron")}
              isLoading={submitting === "email"}
            >
              Sign in as Meron (existing donor)
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => onDevSignIn("anon")}
              isLoading={submitting === "email"}
            >
              Sign in as a brand-new user (will need onboarding)
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-sm text-slate-600">
        Don&apos;t have an account?{" "}
        <Link href="/sign-up" className="font-medium text-sky-700 hover:text-sky-800">
          Create one
        </Link>
      </p>
    </div>
  );
}
