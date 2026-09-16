"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Shield, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/users";
import type { User } from "@/lib/schemas/user";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLES, type Role } from "@/lib/enums";

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "users", { roleFilter }],
    queryFn: () =>
      usersApi.list({
        page: 1,
        limit: 50,
        role: roleFilter || undefined,
      }),
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-semibold text-slate-900">Users</h2>
        <p className="text-sm text-slate-500">
          Manage profiles, roles, verification, and active status.
        </p>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
            <Filter className="h-3 w-3" /> Role
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as Role | "")}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : q.isError ? (
        <EmptyState title="Couldn't load users" />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState title="No users match the filter" />
      ) : (
        <div className="flex flex-col gap-2">
          {q.data.data.map((u) => (
            <UserRow
              key={u._id}
              user={u}
              expanded={expanded === u._id}
              onToggle={() => setExpanded(expanded === u._id ? null : u._id)}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["admin", "users"] });
                qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

type EditorState = { roles: Role[]; isActive: boolean; isVerified: boolean };

function UserRow({
  user,
  expanded,
  onToggle,
  onSaved,
}: {
  user: User;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<EditorState>({
    roles: user.roles,
    isActive: user.isActive,
    isVerified: user.isVerified,
  });

  const save = useMutation({
    mutationFn: (payload: EditorState) => usersApi.adminUpdate(user._id, payload),
    onSuccess: () => {
      toast.success("User updated.");
      onSaved();
    },
    onError: () => toast.error("Couldn't update user."),
  });

  const toggleRole = (role: Role) => {
    setDraft((d) => ({
      ...d,
      roles: d.roles.includes(role)
        ? d.roles.filter((r) => r !== role)
        : [...d.roles, role],
    }));
  };

  const dirty =
    draft.roles.join(",") !== user.roles.join(",") ||
    draft.isActive !== user.isActive ||
    draft.isVerified !== user.isVerified;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-900">{user.name}</span>
            <span className="text-xs text-slate-500">{user.email}</span>
            {user.isActive ? null : (
              <Badge tone="danger">inactive</Badge>
            )}
            {user.isVerified ? <Badge tone="success">verified</Badge> : null}
          </div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {user.roles.map((r) => (
              <Badge key={r} tone="info" className="capitalize">
                {r.replace(/_/g, " ")}
              </Badge>
            ))}
            {user.roles.length === 0 ? (
              <span className="text-xs text-slate-400">No roles</span>
            ) : null}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {expanded ? (
        <CardContent className="flex flex-col gap-4 border-t border-slate-100 pt-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Roles
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    draft.roles.includes(r)
                      ? "border-sky-500 bg-sky-500 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {r.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.isVerified}
                onChange={(e) => setDraft((d) => ({ ...d, isVerified: e.target.checked }))}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
              />
              Verified
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => save.mutate(draft)}
              isLoading={save.isPending}
              disabled={!dirty}
            >
              {dirty ? <UserCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
              {dirty ? "Save changes" : "No changes"}
            </Button>
            {!draft.isActive && user.isActive ? (
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <UserX className="h-3.5 w-3.5" />
                Inactive users cannot sign in.
              </span>
            ) : null}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}