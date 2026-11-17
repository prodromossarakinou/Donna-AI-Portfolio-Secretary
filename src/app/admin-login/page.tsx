"use client";

import { useEffect } from "react";
import { signIn } from "next-auth/react";

export default function AdminLogin() {
  useEffect(() => {
    void signIn("keycloak", { callbackUrl: "/admin" });
  }, []);
  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
    </main>
  );
}
