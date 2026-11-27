"use client";

import Link from "next/link";
import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleAuthLink } from "../../components/google-auth-link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");
const googleErrorMessages: Readonly<Record<string, string>> = {
  google_not_configured: "Google sign-in is not configured on this server yet.",
  google_invalid_state: "The Google sign-in request could not be verified. Please try again.",
  google_cancelled: "Google sign-in was cancelled.",
  google_auth_failed: "Google sign-in could not be completed. Please try again.",
  google_email_unverified: "Google must confirm your email address before you can sign in.",
  account_unavailable: "This account is currently unavailable. Contact the site administrator.",
  auth_not_configured: "Authentication is not configured on this server.",
  account_link_conflict: "This Google account could not be linked. Try signing in with your existing method.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const displayedError = error || googleErrorMessages[searchParams.get("error") ?? ""] || "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Unable to sign in.");
      router.replace("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-5">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border bg-white p-7">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-md bg-blue-700 text-sm text-white">PP</span>
          ProjectProof
        </Link>
        <h1 className="mt-8 text-3xl font-semibold">Welcome back</h1>
        <GoogleAuthLink label="Continue with Google" />
        <div className="mt-5 flex items-center gap-3 text-xs text-neutral-400"><span className="h-px flex-1 bg-neutral-200" />OR SIGN IN WITH EMAIL<span className="h-px flex-1 bg-neutral-200" /></div>
        <label className="mt-6 block text-sm font-semibold">Email
          <input name="email" type="email" required autoComplete="email" className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        <label className="mt-4 block text-sm font-semibold">Password
          <input name="password" type="password" required autoComplete="current-password" className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        <div className="mt-2 text-right"><Link href="/forgot-password" className="text-sm font-semibold text-blue-700 hover:underline">Forgot password?</Link></div>
        {displayedError && <p role="alert" className="mt-4 text-sm text-red-700">{displayedError}</p>}
        <button disabled={loading} className="mt-6 h-11 w-full rounded-md bg-blue-700 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-5 text-center text-sm text-neutral-500">
          New to ProjectProof? <Link href="/register" className="font-semibold text-neutral-950">Create account</Link>
        </p>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-50" />}>
      <LoginForm />
    </Suspense>
  );
}
