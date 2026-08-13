"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { PageSpinner } from "@/components/ui/page-spinner";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!isLoading && !user) router.replace("/login"); }, [isLoading, router, user]);
  if (isLoading || !user) return <PageSpinner label="Checking your secure session…" />;
  return <>{children}</>;
}
