"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

async function sendAdminRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(`${API_URL}/api/v1/admin${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error?.message || "The administrator action could not be completed.");
  }
}

export function AdminUserControls({ userId, role, suspended }: { userId: string; role: string; suspended: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(change: { role?: string; status?: string }) {
    setBusy(true);
    setError("");
    try {
      await sendAdminRequest(`/users/${encodeURIComponent(userId)}`, "PATCH", change);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The account could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <button disabled={busy} onClick={() => void update({ role: role === "ADMIN" ? "USER" : "ADMIN" })} className="rounded-md border px-3 py-2 text-xs font-semibold disabled:opacity-60">
        {role === "ADMIN" ? "Remove admin" : "Make admin"}
      </button>
      <button disabled={busy} onClick={() => void update({ status: suspended ? "ACTIVE" : "SUSPENDED" })} className={`rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-60 ${suspended ? "bg-blue-700 text-white" : "border border-red-200 text-red-800"}`}>
        {suspended ? "Reactivate" : "Suspend"}
      </button>
      {error && <p role="alert" className="basis-full text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function AdminProjectControls({
  projectId,
  visibility,
  deleted,
}: {
  projectId: string;
  visibility: string;
  deleted: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function update(body: { visibility?: string; deleted?: boolean }) {
    setBusy(true);
    setError("");
    try {
      await sendAdminRequest(`/projects/${encodeURIComponent(projectId)}`, "PATCH", body);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Project moderation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!deleted && <select aria-label="Project visibility" disabled={busy} value={visibility} onChange={(event) => void update({ visibility: event.target.value })} className="h-9 rounded-md border bg-white px-2 text-xs">
        <option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted</option><option value="PRIVATE">Private</option>
      </select>}
      <button disabled={busy} onClick={() => void update({ deleted: !deleted })} className={`rounded-md px-3 py-2 text-xs font-semibold disabled:opacity-60 ${deleted ? "bg-blue-700 text-white" : "border border-red-200 text-red-800"}`}>
        {deleted ? "Restore" : "Remove"}
      </button>
      {error && <p role="alert" className="basis-full text-right text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function AdminReportControls({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("RESOLVED");
  const [adminNote, setAdminNote] = useState("");
  const [removeProject, setRemoveProject] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await sendAdminRequest(`/reports/${encodeURIComponent(reportId)}`, "PATCH", {
        status,
        adminNote: adminNote.trim() || null,
        removeProject,
      });
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The report could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border bg-white px-2 text-xs"><option value="RESOLVED">Resolve</option><option value="DISMISSED">Dismiss</option><option value="OPEN">Keep open</option></select>
        <input value={adminNote} onChange={(event) => setAdminNote(event.target.value)} maxLength={2000} className="h-9 min-w-48 flex-1 rounded-md border px-3 text-xs" placeholder="Internal moderation note (optional)" />
      </div>
      <label className="flex items-center gap-2 text-xs text-neutral-700"><input type="checkbox" checked={removeProject} onChange={(event) => setRemoveProject(event.target.checked)} className="accent-red-700" />Also remove this project from public view</label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <button disabled={busy} className="rounded-md bg-blue-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : "Save decision"}</button>
    </form>
  );
}
