"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Lock, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
type Values = z.infer<typeof schema>;

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">Loading…</div>}>
      <SignInInner />
    </Suspense>
  );
}

function SignInInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/me";
  const { signInWithEmail, signInWithGoogle, devSignIn, isMockMode } = useAuth();
  const [submitting, setSubmitting] = useState<null | "email" | "google">(null);

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
      const message = err instanceof Error ? err.message : "Could not sign you in.";
      toast.error(message);
      setSubmitting(null);
    }
  });

  const onGoogle = async () => {
    setSubmitting("google");
    try {
      await signInWithGoogle();
      router.push(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign you in.";
      toast.error(message);
      setSubmitting(null);
    }
  };

  const onDevSignIn = async (mode: "anon" | "meron") => {
    setSubmitting("email");
    try {
      await devSignIn(mode);
      router.push(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not sign you in.";
      toast.error(message);
      setSubmitting(null);
    }
  };

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
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                />
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
        <Card className="border-dashed bg-gradient-to-br from-sky-50/60 to-cyan-50/40">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-base">Demo mode</CardTitle>
            </div>
            <CardDescription>
              Backend is mocked. Use one of these demo identities instead of
              Firebase.
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
