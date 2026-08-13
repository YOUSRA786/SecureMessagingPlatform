"use client";

import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { SettingsView } from "@/components/settings/settings-view";
import { useAuth } from "@/context/auth-context";

function SettingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  if (!user) return null;
  return (
    <main style={{ height: "100vh", width: "100vw" }}>
      <SettingsView user={user} onClose={() => router.push("/chats")} />
    </main>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}
