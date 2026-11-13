import type { Metadata } from "next";
import { LoginView } from "@/features/auth/login-view";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return <LoginView />;
}
