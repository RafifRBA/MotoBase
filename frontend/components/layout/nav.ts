import { Bike, ChartColumn, History, LayoutDashboard, Package, UserCog, Users, Wrench, ClipboardList, UserRound, type LucideIcon } from "lucide-react";
import { ACCESS } from "@/lib/permissions";
import type { Role } from "@/types/models";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: readonly Role[];
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/my-dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["CUSTOMER"] },
  { href: "/my-vehicles", label: "Kendaraan saya", icon: Bike, roles: ["CUSTOMER"] },
  { href: "/my-services", label: "Servis saya", icon: ClipboardList, roles: ["CUSTOMER"] },
  { href: "/my-profile", label: "Profil saya", icon: UserRound, roles: ["CUSTOMER"] },
  { href: "/service-requests", label: "Pengajuan masuk", icon: ClipboardList, roles: ["ADMIN"] },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ACCESS.all },
  { href: "/service-orders", label: "Servis", icon: Wrench, roles: ACCESS.all },
  { href: "/customers", label: "Pelanggan", icon: Users, roles: ACCESS.customersRead },
  { href: "/vehicles", label: "Kendaraan", icon: Bike, roles: ACCESS.all },
  { href: "/spare-parts", label: "Suku cadang", icon: Package, roles: ACCESS.all },
  { href: "/stock-movements", label: "Riwayat stok", icon: History, roles: ACCESS.stockRead },
  { href: "/reports", label: "Laporan", icon: ChartColumn, roles: ACCESS.reports },
  { href: "/users", label: "Pengguna", icon: UserCog, roles: ACCESS.usersRead },
];
