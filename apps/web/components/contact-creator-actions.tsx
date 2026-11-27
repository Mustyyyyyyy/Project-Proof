"use client";

import { useState, type FormEvent } from "react";
import { BriefcaseBusiness, Handshake, X } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function ContactCreatorActions({ username }: { username: string }) {
  const [type, setType] = useState<"HIRE" | "COLLABORATION" | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!type) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/v1/contact-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientUsername: username, type, subject, message }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "The request could not be sent.");
      setType(null);
      setSubject("");
      setMessage("");
      setNotice("Your request has been sent. You’ll be notified when the creator responds.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The request could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 sm:justify-end sm:pb-2">
        <button onClick={() => { setType("HIRE"); setSubject(""); setMessage(""); setError(""); }} className="flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
          <BriefcaseBusiness size={16} /> Hire
        </button>
        <button onClick={() => { setType("COLLABORATION"); setSubject(""); setMessage(""); setError(""); }} className="flex h-10 items-center gap-2 rounded-md border border-blue-200 px-4 text-sm font-semibold text-blue-800 hover:bg-blue-50">
          <Handshake size={16} /> Collaborate
        </button>
      </div>
      {notice && <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">{notice}</p>}
      {type && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-neutral-950/50 p-4" role="presentation">
          <form onSubmit={(event) => void submit(event)} role="dialog" aria-modal="true" aria-labelledby="contact-title" className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="contact-title" className="text-xl font-semibold">{type === "HIRE" ? `Hire ${username}` : `Collaborate with ${username}`}</h2>
                <p className="mt-1 text-sm text-neutral-600">Share the details so they can decide whether it’s a good fit.</p>
              </div>
              <button type="button" onClick={() => setType(null)} aria-label="Close request form" className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100"><X size={20} /></button>
            </div>
            <label className="mt-5 block text-sm font-medium">Subject
              <input required minLength={3} maxLength={160} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1.5 h-11 w-full rounded-md border px-3 font-normal" placeholder={type === "HIRE" ? "Product designer for a new project" : "Collaboration on an open-source tool"} />
            </label>
            <label className="mt-4 block text-sm font-medium">Message
              <textarea required minLength={20} maxLength={4000} rows={6} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1.5 w-full resize-y rounded-md border px-3 py-2 font-normal" placeholder="Describe the work, goals, timing, and how you would like to collaborate." />
            </label>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setType(null)} className="rounded-md border px-4 py-2 text-sm font-semibold">Cancel</button>
              <button disabled={busy} className="rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Sending…" : "Send request"}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
