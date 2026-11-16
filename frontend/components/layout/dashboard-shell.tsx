"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/features/auth/auth-provider";
import { FullPageSpinner } from "@/components/ui/states";
import { ROLE_LABEL } from "@/lib/constants";
import { hasRole } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav";
import { ROLE_HOME } from "@/lib/permissions";

export function DashboardShell({ children }: { children: ReactNode }) {
  const { user, status, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    else if (status === "authenticated" && user && user.role === "CUSTOMER" && !pathname.startsWith("/my-")) router.replace(ROLE_HOME.CUSTOMER);
    else if (status === "authenticated" && user && user.role !== "CUSTOMER" && pathname.startsWith("/my-")) router.replace(ROLE_HOME[user.role]);
  }, [status, router, user, pathname]);

  if (status !== "authenticated" || !user) return <FullPageSpinner />;

  const items = NAV_ITEMS.filter((i) => hasRole(user.role, i.roles));
  const current = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-asphalt-900 text-slate-300 transition-transform lg:static lg:w-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center bg-white px-5">
          <Logo className="h-8" />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Menu utama">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-600 text-white" : "hover:bg-asphalt-800 hover:text-white",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-asphalt-800 p-4">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-slate-400">{ROLE_LABEL[user.role]}</p>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
          >
            <LogOut className="size-4" aria-hidden /> Keluar
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-asphalt-900/50 lg:hidden" onClick={() => setOpen(false)} aria-hidden />}

      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} aria-label="Buka menu" className="rounded-md p-1.5 hover:bg-slate-100">
            <Menu className="size-5" />
          </button>
          <span className="font-semibold text-slate-900">{current?.label ?? "MotoBase"}</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
