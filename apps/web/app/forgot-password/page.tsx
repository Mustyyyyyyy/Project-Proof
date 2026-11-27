"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export default function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json() as { data?: { message?: string }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not request a reset code.");
      setSentEmail(email);
      setSent(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not request a reset code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-neutral-50 px-5">
      <section className="w-full max-w-md rounded-lg border bg-white p-7">
        <Link href="/" className="flex items-center gap-2 font-bold"><span className="grid size-8 place-items-center rounded-md bg-blue-700 text-sm text-white">PP</span>ProjectProof</Link>
        {sent ? (
          <>
            <h1 className="mt-8 text-3xl font-semibold">Check your email</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-600">If an account exists for this address, a six-digit reset code will arrive shortly. The code expires after 10 minutes.</p>
            <Link href={`/reset-password?email=${encodeURIComponent(sentEmail)}`} className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-md bg-blue-700 text-sm font-semibold text-white">Enter reset code</Link>
          </>
        ) : (
          <form onSubmit={(event) => void submit(event)}>
            <h1 className="mt-8 text-3xl font-semibold">Reset your password</h1>
            <p className="mt-2 text-sm leading-6 text-neutral-600">Enter your account email and we’ll send you a one-time reset code.</p>
            <label className="mt-6 block text-sm font-semibold">Email
              <input name="email" type="email" required autoComplete="email" className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
            </label>
            {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
            <button disabled={busy} className="mt-6 h-11 w-full rounded-md bg-blue-700 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send reset code"}</button>
            <p className="mt-5 text-center text-sm text-neutral-500"><Link href="/login" className="font-semibold text-blue-700">Back to sign in</Link></p>
          </form>
        )}
      </section>
    </main>
  );
}
