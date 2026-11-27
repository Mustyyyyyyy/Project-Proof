"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { GoogleAuthLink } from "../../components/google-auth-link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          username: formData.get("username"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Unable to create account.");
      window.location.assign("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border bg-white p-7">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span className="grid size-8 place-items-center rounded-md bg-blue-700 text-sm text-white">PP</span>
          ProjectProof
        </Link>
        <h1 className="mt-8 text-3xl font-semibold">Create your portfolio</h1>
        <GoogleAuthLink label="Sign up with Google" />
        <div className="mt-5 flex items-center gap-3 text-xs text-neutral-400"><span className="h-px flex-1 bg-neutral-200" />OR CREATE AN ACCOUNT WITH EMAIL<span className="h-px flex-1 bg-neutral-200" /></div>
        <label className="mt-6 block text-sm font-semibold">Full name
          <input name="fullName" required autoComplete="name" maxLength={100} className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        <label className="mt-4 block text-sm font-semibold">Username
          <input name="username" required autoComplete="username" minLength={3} maxLength={30} pattern="[A-Za-z0-9_]+" className="mt-2 h-11 w-full rounded-md border px-3" />
          <span className="mt-1 block text-xs font-normal text-neutral-500">3–30 letters, numbers, or underscores.</span>
        </label>
        <label className="mt-4 block text-sm font-semibold">Email
          <input name="email" type="email" required autoComplete="email" className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        <label className="mt-4 block text-sm font-semibold">Password
          <input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="mt-6 h-11 w-full rounded-md bg-blue-700 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? "Creating account..." : "Create account"}
        </button>
        <p className="mt-5 text-center text-sm text-neutral-500">
          Already have an account? <Link href="/login" className="font-semibold text-neutral-950">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
