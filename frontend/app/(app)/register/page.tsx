import type { Metadata } from "next";
import { RegisterView } from "@/features/auth/register-view";
export const metadata: Metadata = { title: "Daftar pelanggan" };
export default function RegisterPage() { return <RegisterView />; }
