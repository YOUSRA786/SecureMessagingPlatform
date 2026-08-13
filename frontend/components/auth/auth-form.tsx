"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { BrandMark } from "@/components/ui/brand-mark";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/auth-context";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isLogin = mode === "login";
  const { login, register } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identityMode, setIdentityMode] = useState<"username" | "phone">("username");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      if (isLogin) {
        await login(String(data.get("identifier")), String(data.get("password")));
      } else {
        const payload: { username?: string; phone?: string; password: string; otp: string; display_name?: string } = {
          display_name: String(data.get("displayName")),
          password: String(data.get("password")),
          otp: String(data.get("otp")),
        };
        if (identityMode === "username") {
          payload.username = String(data.get("identity")).trim();
        } else {
          payload.phone = String(data.get("identity")).trim();
        }
        await register(payload);
      }
      router.replace("/chats");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-panel">
        <div className="auth-card">
          <BrandMark />
          <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p>{isLogin ? "Sign in to access your Signal Messenger conversations." : "Start messaging securely with your trusted contacts."}</p>

          {error && <Alert>{error}</Alert>}

          <form style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }} onSubmit={submit}>
            {!isLogin && (
              <>
                <div className="form-group">
                  <label>Register using</label>
                  <select
                    className="form-input"
                    value={identityMode}
                    onChange={(e) => setIdentityMode(e.target.value as "username" | "phone")}
                  >
                    <option value="username">Username</option>
                    <option value="phone">Phone number</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Display Name</label>
                  <input className="form-input" name="displayName" required placeholder="e.g. Yousra Ali" autoComplete="name" />
                </div>
              </>
            )}

            <div className="form-group">
              <label>{isLogin ? "Username or Phone" : identityMode === "username" ? "Username" : "Phone Number"}</label>
              <input
                className="form-input"
                name={isLogin ? "identifier" : "identity"}
                required
                placeholder={isLogin ? "yousra or +919876500001" : identityMode === "username" ? "yousra_dev" : "+919876543210"}
                autoComplete="username"
              />
              {!isLogin && (
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                  {identityMode === "username"
                    ? "Must be 3-50 letters, numbers, or underscores (e.g. yousra_dev)"
                    : "Must be in international format (e.g. +919876543210)"}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                className="form-input"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Development OTP</label>
                <input className="form-input" name="otp" required defaultValue="123456" inputMode="numeric" />
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                  Use default testing OTP: 123456
                </span>
              </div>
            )}

            <button type="submit" className="auth-button" disabled={isSubmitting}>
              {isSubmitting ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "14px", marginTop: "20px", color: "var(--text-muted)" }}>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <Link href={isLogin ? "/register" : "/login"} style={{ color: "var(--brand)", fontWeight: 600 }}>
              {isLogin ? "Register" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
