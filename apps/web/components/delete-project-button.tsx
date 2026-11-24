"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm("Delete this project? It will be removed from your public portfolio.")) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${projectId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 401) throw new Error("Your session expired. Sign in again.");
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "The project could not be deleted.");
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The project could not be deleted.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={() => void remove()} disabled={loading} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-60">
        {loading ? "Deleting…" : "Delete"}
      </button>
      {error && <p role="alert" className="mt-2 max-w-48 text-xs text-red-700">{error}</p>}
    </div>
  );
}
