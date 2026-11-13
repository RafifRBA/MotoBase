import type { Metadata } from "next";
import { TrackingView } from "@/features/tracking/tracking-view";

export const instant = false;
export const metadata: Metadata = { title: "Pantau servis", robots: { index: false } };

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <TrackingView token={token} />;
}
