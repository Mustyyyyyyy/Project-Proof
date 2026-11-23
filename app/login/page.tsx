"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      window.location.assign("/dashboard");
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
        <label className="mt-6 block text-sm font-semibold">Email
          <input name="email" type="email" required autoComplete="email" className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        <label className="mt-4 block text-sm font-semibold">Password
          <input name="password" type="password" required autoComplete="current-password" className="mt-2 h-11 w-full rounded-md border px-3" />
        </label>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
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
