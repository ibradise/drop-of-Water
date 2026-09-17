"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Heart, Info, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { campaignsApi } from "@/lib/api/campaigns";
import { donationsApi } from "@/lib/api/donations";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { formatSmallestUnit, parseToSmallestUnit } from "@/lib/money";
import { HIGH_VALUE_DONATION_THRESHOLD, PAYMENT_METHODS } from "@/lib/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { ProgressBar } from "@/components/progress-bar";
import { Badge } from "@/components/ui/badge";

const presetAmounts = [100, 250, 500, 1_000, 2_500, 5_000] as const;

const formSchema = z
  .object({
    amount: z
      .number()
      .min(1, "Amount must be at least 1 ETB"),
    paymentMethod: z.enum(PAYMENT_METHODS),
    message: z.string().max(1000).optional(),
    isAnonymous: z.boolean(),
    donorName: z.string().max(120).optional(),
    donorEmail: z.string().email("Enter a valid email").max(200).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.amount >= HIGH_VALUE_DONATION_THRESHOLD) {
      if (!data.donorEmail) {
        ctx.addIssue({
          path: ["donorEmail"],
          code: z.ZodIssueCode.custom,
          message: "Required for gifts at or above the review threshold",
        });
      }
      if (!data.donorName) {
        ctx.addIssue({
          path: ["donorName"],
          code: z.ZodIssueCode.custom,
          message: "Required for gifts at or above the review threshold",
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

export function DonateFlow({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { state } = useAuth();
  const isAuthed = state.status === "authenticated";
  const isAuthUnknown = state.status === "loading";
  const [state_, setState] = useState<"idle" | "submitting" | "awaitingCheckout">("idle");
  const [preset, setPreset] = useState<number | null>(500);
  const [amountInput, setAmountInput] = useState<string>("500");

  const campaignQ = useQuery({
    queryKey: ["campaigns", "get", campaignId],
    queryFn: () => campaignsApi.get(campaignId, true),
    retry: (count, err) => !(err instanceof ApiError && err.statusCode === 404) && count < 2,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 500,
      paymentMethod: "chapa",
      message: "",
      isAnonymous: false,
      donorName: "",
      donorEmail: "",
    },
  });

  const currentAmount = watch("amount");
  const paymentMethod = watch("paymentMethod");
  const isAnonymous = watch("isAnonymous");
  const message = watch("message");
  const donorName = watch("donorName");
  const donorEmail = watch("donorEmail");

  useEffect(() => {
    if (preset != null) {
      setValue("amount", preset, { shouldValidate: true });
    }
  }, [preset, setValue]);

  const mutate = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        campaignId,
        amount: parseToSmallestUnit(values.amount, "ETB"),
        paymentMethod: values.paymentMethod,
        message: values.message || undefined,
        isAnonymous: values.isAnonymous,
        donor: !isAuthed
          ? {
              name: values.donorName || undefined,
              email: values.donorEmail || undefined,
            }
          : undefined,
      };
      return donationsApi.create(body, { skipAuth: !isAuthed });
    },
    onSuccess: (data) => {
      setState("awaitingCheckout");
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["donations"] });
      const url = data.checkout?.checkoutUrl;
      if (url) {
        window.location.assign(url);
      } else {
        toast.success("Donation recorded. We'll notify you when it settles.");
        router.push(
          `/campaigns/${campaignId}/donate/return?status=manual&tx_ref=${data.donation.transactionId ?? ""}`,
        );
      }
    },
    onError: (err) => {
      setState("idle");
      const messages =
        err instanceof ApiError ? err.messages : ["Couldn't submit your donation."];
      toast.error(messages[0] ?? "Couldn't submit your donation.");
    },
  });

  const onSubmit = handleSubmit((values) => {
    setState("submitting");
    mutate.mutate(values);
  });

  const onAmountInput = (raw: string) => {
    setPreset(null);
    setAmountInput(raw);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) setValue("amount", n, { shouldValidate: true });
  };

  if (campaignQ.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-7 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (campaignQ.isError) {
    const is404 = campaignQ.error instanceof ApiError && campaignQ.error.statusCode === 404;
    const isUnexpected = !(campaignQ.error instanceof ApiError);
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {is404
              ? "Campaign not found"
              : isUnexpected
                ? "Data looked unexpected"
                : "Couldn't load this campaign"}
          </CardTitle>
          <CardDescription>
            {is404
              ? "It may have been removed or the link is wrong."
              : isUnexpected
                ? "Please refresh; if it keeps happening, contact support."
                : "Something went wrong talking to the API."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => campaignQ.refetch()}>
            Retry
          </Button>
          <Link href="/campaigns">
            <Button variant="outline">Back to campaigns</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const campaign = campaignQ.data;
  if (!campaign) return null;
  const reviewThresholdEtb = HIGH_VALUE_DONATION_THRESHOLD / 100;
  const willTriggerReview = currentAmount >= reviewThresholdEtb;
  const disabled = state_ !== "idle" || isAuthUnknown;

  return (
    <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-6">
        <Link
          href={`/campaigns/${campaignId}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden>←</span> Back to campaign
        </Link>

        <header className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            Make a gift
          </span>
          <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-900">
            Donate to {campaign.title}
          </h1>
          <p className="text-slate-600">
            {campaign.summary ?? "Your gift will go directly to this campaign."}
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amount</CardTitle>
              <CardDescription>Choose a preset or enter your own.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {presetAmounts.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setPreset(a);
                      setAmountInput(String(a));
                    }}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                      preset === a
                        ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                    disabled={disabled}
                  >
                    {a.toLocaleString()}
                  </button>
                ))}
              </div>
              <div>
                <label
                  htmlFor="amount"
                  className="mb-1 block text-sm font-medium text-slate-700"
                >
                  Or enter an amount in ETB
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">ETB</span>
                  <input
                    id="amount"
                    type="number"
                    min={1}
                    step={1}
                    value={amountInput}
                    onChange={(e) => onAmountInput(e.target.value)}
                    className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                    disabled={disabled}
                  />
                </div>
                {errors.amount ? (
                  <p className="mt-1 text-xs text-rose-600">{errors.amount.message}</p>
                ) : null}
              </div>
              {willTriggerReview ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                  <p>
                    Gifts of {formatSmallestUnit(HIGH_VALUE_DONATION_THRESHOLD, "ETB")} or more
                    are reviewed by our finance team after the gateway captures the
                    payment. You will still be charged immediately.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment method</CardTitle>
              <CardDescription>You will be redirected to the gateway to pay.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(["chapa", "zeffy", "paypal", "stripe"] as const).map((m) => (
                  <label
                    key={m}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-3 text-sm transition-colors ${
                      paymentMethod === m
                        ? "border-sky-500 bg-sky-50/60"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      value={m}
                      {...register("paymentMethod")}
                      className="h-3.5 w-3.5 accent-sky-600"
                      disabled={disabled}
                    />
                    <span className="font-medium capitalize text-slate-900">{m}</span>
                    {m === "zeffy" ? (
                      <Badge tone="info" className="ml-auto">
                        USD/CAD
                      </Badge>
                    ) : null}
                  </label>
                ))}
              </div>
              {paymentMethod === "zeffy" ? (
                <p className="text-xs text-slate-500">
                  Zeffy only accepts USD or CAD. Use the same email on the form as on
                  this donation.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {!isAuthed && !isAuthUnknown ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your details</CardTitle>
                <CardDescription>
                  Optional for small gifts. Required for gifts at or above the review
                  threshold.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  id="donorName"
                  label="Name"
                  error={errors.donorName?.message}
                  disabled={disabled}
                  {...register("donorName")}
                />
                <Field
                  id="donorEmail"
                  label="Email"
                  type="email"
                  error={errors.donorEmail?.message}
                  disabled={disabled}
                  {...register("donorEmail")}
                />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message (optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                rows={3}
                placeholder="A note to the campaigners…"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                {...register("message")}
                disabled={disabled}
              />
            </CardContent>
          </Card>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              {...register("isAnonymous")}
              className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
              disabled={disabled}
            />
            Hide my name on the public donor list
          </label>

          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              You will be redirected to the payment gateway to complete your gift.
            </p>
            <Button
              type="submit"
              size="lg"
              isLoading={state_ === "submitting" || state_ === "awaitingCheckout"}
              disabled={disabled}
            >
              {state_ === "awaitingCheckout" ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4" />
                  Donate {formatSmallestUnit(currentAmount * 100, "ETB")}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      <aside className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your gift</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex items-baseline justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">
                <Money cents={currentAmount * 100} currency="ETB" emphasis="lg" />
              </span>
            </div>
            {message ? (
              <div className="flex flex-col gap-1">
                <span className="text-slate-500">Message</span>
                <span className="text-slate-700">{message}</span>
              </div>
            ) : null}
            {!isAuthed && (donorName || donorEmail) ? (
              <div className="flex flex-col gap-1">
                <span className="text-slate-500">Donor</span>
                <span className="text-slate-700">
                  {donorName ?? "Anonymous"}{" "}
                  {isAnonymous ? <span className="text-xs">(hidden publicly)</span> : null}
                </span>
                {donorEmail ? (
                  <span className="text-xs text-slate-500">{donorEmail}</span>
                ) : null}
              </div>
            ) : null}
            <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
              <p className="inline-flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                Your donation is created as <em>pending</em> until the gateway
                confirms capture. Only then does it count toward the campaign
                total.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaign progress</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <ProgressBar value={campaign.currentAmount} max={campaign.goalAmount} />
            <div className="flex items-baseline justify-between">
              <span className="font-medium text-slate-900">
                <Money cents={campaign.currentAmount} currency={campaign.currency} />
              </span>
              <span className="text-xs text-slate-500">
                of <Money cents={campaign.goalAmount} currency={campaign.currency} />
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  error,
  disabled,
  ...inputProps
}: {
  id: string;
  label: string;
  type?: string;
  error?: string;
  disabled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        disabled={disabled}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        {...inputProps}
      />
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
