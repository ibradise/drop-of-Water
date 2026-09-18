"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { notificationsApi } from "@/lib/api/notifications";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";

export default function MeNotificationsPage() {
  const qc = useQueryClient();
  const [tokenInput, setTokenInput] = useState("");

  const listQ = useQuery({
    queryKey: ["notifications", "me"],
    queryFn: () => notificationsApi.mine(),
  });

  const registerToken = useMutation({
    mutationFn: (token: string) => notificationsApi.registerDevice(token),
    onSuccess: () => {
      toast.success("Push notifications turned on for this device.");
      setTokenInput("");
    },
    onError: (err) => {
      console.error("Register device token failed:", err);
      toast.error("We couldn't turn on push notifications for this device. Please check the token and try again.");
    },
  });

  const unregisterToken = useMutation({
    mutationFn: (token: string) => notificationsApi.unregisterDevice(token),
    onSuccess: () => toast.success("Push notifications turned off for this device."),
    onError: (err) => {
      console.error("Unregister device token failed:", err);
      toast.error("We couldn't turn off notifications for this device. Please try again.");
    },
  });

  const items = listQ.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-slate-900">Notifications</h2>
        <p className="text-sm text-slate-500">
          Your in-app notification history (newest first, up to 50). Push is opt-in
          — register a Firebase Cloud Messaging device token below to receive
          updates on your phone.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Push notifications</h3>
          <p className="text-xs text-slate-500">
            In dev mode, paste any string as a fake device token. The real Firebase
            SDK will provide the real token in production.
          </p>
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!tokenInput.trim()) return;
              registerToken.mutate(tokenInput.trim());
            }}
          >
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="FCM device token (or any string in dev)"
              aria-label="Device token"
              className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            <Button
              type="submit"
              isLoading={registerToken.isPending}
              disabled={!tokenInput.trim()}
            >
              <Bell className="h-4 w-4" />
              Register
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => unregisterToken.mutate(tokenInput.trim())}
              isLoading={unregisterToken.isPending}
              disabled={!tokenInput.trim()}
            >
              <BellOff className="h-4 w-4" />
              Unregister
            </Button>
          </form>
        </CardContent>
      </Card>

      {listQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : listQ.isError ? (
        <EmptyState
          title="We couldn't load notifications"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => qc.invalidateQueries({ queryKey: ["notifications", "me"] })}>
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="When something happens on a project or campaign you support, it will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex items-start gap-3 rounded-lg border bg-white p-3 ${
                n.read ? "border-slate-200" : "border-sky-200 bg-sky-50/30"
              }`}
            >
              <div
                className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                  n.read ? "bg-slate-300" : "bg-sky-500"
                }`}
                aria-hidden
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
                </div>
                <p className="text-sm text-slate-600">{n.body}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {formatDateTime(n.createdAt)}
                </p>
              </div>
              {n.read ? (
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-xs text-slate-400">
                  <Check className="h-4 w-4 text-slate-300" aria-hidden />
                  <span className="sr-only">Read</span>
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
