"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  reasonMaxLength?: number;
  isPending?: boolean;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  reasonLabel,
  reasonPlaceholder,
  reasonMaxLength = 1000,
  isPending = false,
}: ConfirmDialogProps) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  const close = () => {
    setReason("");
    onOpenChange(false);
  };

  const confirm = () => {
    onConfirm(reasonLabel ? reason.trim() : "");
    setReason("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape" && !isPending) close();
      }}
    >
      <div className="absolute inset-0 bg-slate-900/50" onClick={() => !isPending && close()} aria-hidden />
      <div className="relative flex w-full max-w-md flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          ) : null}
        </div>
        {reasonLabel ? (
          <div>
            <label
              htmlFor="confirm-dialog-reason"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              {reasonLabel}
            </label>
            <textarea
              id="confirm-dialog-reason"
              rows={3}
              value={reason}
              maxLength={reasonMaxLength}
              placeholder={reasonPlaceholder}
              onChange={(e) => setReason(e.target.value)}
              disabled={isPending}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            onClick={confirm}
            isLoading={isPending}
            className={cn(danger && "bg-rose-600 hover:bg-rose-700")}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
