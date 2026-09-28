"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/lib/auth/context";
import { ChevronDown, ChevronUp, Filter, Shield, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { usersApi } from "@/lib/api/users";
import type { User } from "@/lib/schemas/user";
import { Card, CardContent, EmptyState } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pager } from "@/components/pager";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { ENTITY_TYPES, ROLES, type EntityType, type Role } from "@/lib/enums";

export default function AdminUsersPage() {
  const { state } = useAuth();
  const meId = state.status === "authenticated" ? state.user.id : null;
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [entityType, setEntityType] = useState<EntityType | "">("");
  const [verified, setVerified] = useState<string>("");
  const [active, setActive] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters = {
    page,
    limit,
    role: roleFilter || undefined,
    entityType: entityType || undefined,
    isVerified: verified === "" ? undefined : verified === "true",
    isActive: active === "" ? undefined : active === "true",
  };

  const q = useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => usersApi.list(filters),
  });

  const applyFilter = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const removeUser = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      toast.success("User removed from listings.");
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (err) => {
      console.error("Remove user failed:", err);
      toast.error("We couldn't remove this user. Please try again.");
    },
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
            onChange={(e) => applyFilter(() => setRoleFilter(e.target.value as Role | ""))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={entityType}
            onChange={(e) => applyFilter(() => setEntityType(e.target.value as EntityType | ""))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">All entity types</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={verified}
            onChange={(e) => applyFilter(() => setVerified(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">Verified: any</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select
            value={active}
            onChange={(e) => applyFilter(() => setActive(e.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
          >
            <option value="">Active: any</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
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
        <EmptyState
          title="We couldn't load users"
          description="Something went wrong on our side. Please try again. If it keeps failing, contact support."
          action={
            <Button variant="outline" onClick={() => q.refetch()}>
              Retry
            </Button>
          }
        />
      ) : !q.data ? null : q.data.data.length === 0 ? (
        <EmptyState
          title="No users match the filter"
          description="Try clearing or changing your filter."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setRoleFilter("");
                setEntityType("");
                setVerified("");
                setActive("");
                setPage(1);
              }}
            >
              Clear filters
            </Button>
          }
        />
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
              isSelf={u.id === meId}
              onRequestDelete={() => setDeleteId(u._id)}
            />
          ))}
        </div>
      )}
      {q.data && q.data.data.length > 0 ? (
        <Pager
          page={q.data.meta.page}
          limit={q.data.meta.limit}
          total={q.data.meta.total}
          hasPrevPage={q.data.meta.hasPrevPage}
          hasNextPage={q.data.meta.hasNextPage}
          onPage={setPage}
        />
      ) : null}

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        onConfirm={() => {
          if (deleteId) removeUser.mutate(deleteId);
        }}
        title="Remove this user?"
        description="They disappear from listings and can no longer sign in. Their donation history is kept for records."
        confirmLabel="Yes, remove"
        danger
        isPending={removeUser.isPending}
      />
    </div>
  );
}

type EditorState = { roles: Role[]; isActive: boolean; isVerified: boolean };

function UserRow({
  user,
  expanded,
  onToggle,
  onSaved,
  isSelf,
  onRequestDelete,
}: {
  user: User;
  expanded: boolean;
  onToggle: () => void;
  onSaved: () => void;
  isSelf: boolean;
  onRequestDelete: () => void;
}) {
  const [draft, setDraft] = useState<EditorState>({
    roles: user.roles,
    isActive: user.isActive,
    isVerified: user.isVerified,
  });

  const userKey = `${user._id}:${user.roles.join(",")}:${user.isActive}:${user.isVerified}`;
  const [syncedKey, setSyncedKey] = useState(userKey);
  if (syncedKey !== userKey) {
    setSyncedKey(userKey);
    setDraft({ roles: user.roles, isActive: user.isActive, isVerified: user.isVerified });
  }

  const save = useMutation({
    mutationFn: (payload: EditorState) => usersApi.adminUpdate(user._id, payload),
    onSuccess: () => {
      toast.success(`Changes to ${user.name} have been saved.`);
      onSaved();
    },
    onError: (err) => {
      console.error("Update user failed:", err);
      toast.error("We couldn't save changes to this user. Please try again.");
    },
  });

  const remove = useMutation({
    mutationFn: () => usersApi.remove(user._id),
    onSuccess: () => {
      toast.success(`${user.name} has been removed from listings.`);
      onSaved();
    },
    onError: (err) => {
      console.error("Remove user failed:", err);
      toast.error("We couldn't remove this user. Please try again.");
    },
  });

  const toggleRole = (role: Role) => {
    if (isSelf && role === "system_admin" && draft.roles.includes("system_admin")) return;
    setDraft((d) => ({
      ...d,
      roles: d.roles.includes(role)
        ? d.roles.filter((r) => r !== role)
        : [...d.roles, role],
    }));
  };

  const dirty =
    [...draft.roles].sort().join(",") !== [...user.roles].sort().join(",") ||
    draft.isActive !== user.isActive ||
    draft.isVerified !== user.isVerified;

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${expanded ? "Hide" : "Show"} editor for ${user.name}`}
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
              {ROLES.map((r) => {
                const locked = isSelf && r === "system_admin" && draft.roles.includes("system_admin");
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    disabled={locked}
                    title={locked ? "You can't remove your own system admin role" : undefined}
                    className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                      locked
                        ? "cursor-not-allowed opacity-50"
                        : ""
                    } ${
                      draft.roles.includes(r)
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {r.replace(/_/g, " ")}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft((d) => ({ ...d, isActive: e.target.checked }))}
                disabled={isSelf && user.isActive}
                className="h-3.5 w-3.5 rounded border-slate-300 accent-sky-600"
              />
              Active
              {isSelf ? <span className="text-xs text-slate-400">(you)</span> : null}
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
            <Button
              size="sm"
              variant="ghost"
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={onRequestDelete}
              isLoading={remove.isPending}
            >
              Remove
            </Button>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}