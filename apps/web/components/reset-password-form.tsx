"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function ResetPasswordForm({ defaultEmail }: { defaultEmail: string }) {
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          code: formData.get("code"),
          password: formData.get("password"),
        }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not reset your password.");
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not reset your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-5">
      <section className="w-full max-w-md rounded-lg border bg-white p-7">
        <Link href="/" className="flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-md bg-blue-700 text-sm text-white">PP</span>ProjectProof</Link>
        {complete ? (
          <>
            <h1 className="mt-8 text-3xl font-semibold">Password updated</h1>
            <p className="mt-3 text-sm text-neutral-600">Your password has been changed. Sign in with your new password.</p>
            <Link href="/login" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-blue-700 text-sm font-semibold text-white">Go to sign in</Link>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <h1 className="mt-8 text-3xl font-semibold">Choose a new password</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Enter the six-digit code from your email and choose a new password.</p>
            <label className="mt-6 block text-sm font-semibold">Email
              <input name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
            </label>
            <label className="mt-4 block text-sm font-semibold">Six-digit code
              <input name="code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required autoComplete="one-time-code" className="mt-2 h-11 w-full rounded-md border px-3 font-normal tracking-[0.3em]" />
            </label>
            <label className="mt-4 block text-sm font-semibold">New password
              <input name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
            </label>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 h-11 w-full rounded-md bg-blue-700 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Updating…" : "Update password"}</button>
            <p className="mt-5 text-center text-sm text-neutral-500"><Link href="/forgot-password" className="font-semibold text-blue-700">Request another code</Link></p>
          </form>
        )}
      </section>
    </main>
  );
}
