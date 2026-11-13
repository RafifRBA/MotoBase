"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { ErrorState, PageHeader } from "@/components/ui/states";
import { useCan } from "@/components/role-gate";
import { useAuth } from "@/features/auth/auth-provider";
import { ROLE_LABEL } from "@/lib/constants";
import { formatDateTime, formatPhone } from "@/lib/format";
import { ACCESS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Role, User } from "@/types/models";
import { useCreateUser, useSetUserStatus, useUpdateUser, useUsers } from "./hooks";
import { UserForm } from "./user-form";

const FILTERS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Semua" },
  { value: "ADMIN", label: "Kasir / Admin" },
  { value: "MECHANIC", label: "Mekanik" },
  { value: "OWNER", label: "Pemilik" },
];

export function UserList() {
  const { user: me } = useAuth();
  const canWrite = useCan(ACCESS.usersWrite);
  const [role, setRole] = useState<Role | "">("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [toggling, setToggling] = useState<User | null>(null);
  const q = useUsers({ page, limit: 15, role });
  const create = useCreateUser();
  const update = useUpdateUser(editing?.id ?? "");
  const setStatus = useSetUserStatus();

  return (
    <>
      <PageHeader
        title="Pengguna"
        description="Akun staf bengkel dan wewenangnya."
        actions={canWrite && <Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden /> Akun staf baru</Button>}
      />
      <Card>
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4" role="group" aria-label="Filter peran">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              aria-pressed={role === f.value}
              onClick={() => { setRole(f.value); setPage(1); }}
              className={cn("rounded-full px-3 py-1 text-sm font-medium", role === f.value ? "bg-asphalt-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
            >
              {f.label}
            </button>
          ))}
        </div>
        {q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : (
          <DataTable
            loading={q.isLoading}
            rows={q.data?.items ?? []}
            rowKey={(u) => u.id}
            emptyTitle="Belum ada akun"
            columns={[
              { header: "Nama", cell: (u) => <><span className="font-medium text-slate-900">{u.name}</span><span className="block text-xs text-slate-500">{u.email}</span></> },
              { header: "Peran", cell: (u) => ROLE_LABEL[u.role] },
              { header: "Telepon", cell: (u) => formatPhone(u.phone) },
              { header: "Login terakhir", cell: (u) => formatDateTime(u.lastLoginAt) },
              { header: "Status", cell: (u) => <Badge tone={u.isActive ? "green" : "gray"}>{u.isActive ? "Aktif" : "Nonaktif"}</Badge> },
              ...(canWrite
                ? [{
                    header: "Aksi",
                    className: "text-right",
                    cell: (u: User) => (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u)} aria-label={`Ubah ${u.name}`}><Pencil className="size-3.5" aria-hidden /></Button>
                        {u.id !== me?.id && (
                          <Button size="sm" variant="ghost" onClick={() => setToggling(u)}>{u.isActive ? "Nonaktifkan" : "Aktifkan"}</Button>
                        )}
                      </div>
                    ),
                  }]
                : []),
            ]}
          />
        )}
        <Pagination meta={q.data?.meta} onPage={setPage} />
      </Card>

      <Modal open={creating} onClose={() => setCreating(false)} title="Akun staf baru">
        <UserForm
          loading={create.isPending}
          onCancel={() => setCreating(false)}
          onSubmit={async (v) => {
            if (await create.mutateAsync({ name: v.name, email: v.email, phone: v.phone, password: v.password!, role: v.role! }).then(() => true, () => false)) setCreating(false);
          }}
        />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Ubah akun">
        {editing && (
          <UserForm
            existing={editing}
            loading={update.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={async (v) => {
              if (await update.mutateAsync({ name: v.name, email: v.email, phone: v.phone }).then(() => true, () => false)) setEditing(null);
            }}
          />
        )}
      </Modal>
      <ConfirmDialog
        open={!!toggling}
        onClose={() => setToggling(null)}
        title={toggling?.isActive ? "Nonaktifkan akun?" : "Aktifkan akun?"}
        description={toggling?.isActive ? `${toggling?.name} tidak akan bisa masuk lagi sampai diaktifkan kembali. Riwayat kerjanya tetap tersimpan.` : `${toggling?.name} akan bisa masuk kembali.`}
        confirmLabel={toggling?.isActive ? "Nonaktifkan" : "Aktifkan"}
        danger={!!toggling?.isActive}
        loading={setStatus.isPending}
        onConfirm={() => toggling && setStatus.mutate({ id: toggling.id, isActive: !toggling.isActive }, { onSuccess: () => setToggling(null) })}
      />
    </>
  );
}
