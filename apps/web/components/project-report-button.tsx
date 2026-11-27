"use client";

import { FormEvent, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function ProjectReportButton({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${encodeURIComponent(projectId)}/report`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: formData.get("reason"), details: formData.get("details") }),
      });
      const result = await response.json();
      if (response.status === 401) throw new Error("Sign in before reporting a project.");
      if (!response.ok) throw new Error(result.error?.message || "The report could not be submitted.");
      setSubmitted(true);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The report could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 border-t border-neutral-200 pt-4">
      {submitted ? <p role="status" className="text-sm text-green-800">Thank you. Your report has been sent to the moderation team.</p> : (
        <>
          <button onClick={() => { setOpen((value) => !value); setError(""); }} className="text-sm font-medium text-neutral-500 hover:text-neutral-900">{open ? "Cancel report" : "Report this project"}</button>
          {open && <form onSubmit={submit} className="mt-3 space-y-3">
            <label className="block text-xs font-semibold">Reason<select name="reason" required className="mt-1 h-10 w-full rounded-md border bg-white px-3 text-sm font-normal"><option value="COPYRIGHT">Copyright or ownership concern</option><option value="HARASSMENT">Harassment or abuse</option><option value="MISLEADING">Misleading or impersonation</option><option value="INAPPROPRIATE">Inappropriate content</option><option value="OTHER">Other concern</option></select></label>
            <label className="block text-xs font-semibold">Details<textarea name="details" maxLength={2000} rows={3} className="mt-1 w-full rounded-md border p-3 text-sm font-normal" placeholder="Share relevant context for the moderation team." /></label>
            {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
            <button disabled={busy} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-800 disabled:opacity-60">{busy ? "Sending…" : "Submit report"}</button>
          </form>}
          {!open && error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
        </>
      )}
    </div>
  );
}
