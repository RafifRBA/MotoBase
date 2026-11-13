import { AuthProvider } from "@/features/auth/auth-provider";

export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
