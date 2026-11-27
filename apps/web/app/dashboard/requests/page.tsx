"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface ContactRequest {
  id: string;
  type: "HIRE" | "COLLABORATION";
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED";
  subject: string;
  message: string;
  createdAt: string;
  sender: { username: string; profile: { fullName: string; avatarUrl: string | null; professionalTitle: string | null } | null };
  recipient: { username: string; profile: { fullName: string; avatarUrl: string | null; professionalTitle: string | null } | null };
}

export default function RequestsPage() {
  const router = useRouter();
  const [direction, setDirection] = useState<"incoming" | "outgoing">("incoming");
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadRequests = useCallback(async (signal?: AbortSignal) => {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/contact-requests?direction=${direction}`, { credentials: "include", signal });
      const result = await response.json() as { data?: ContactRequest[]; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not load contact requests.");
      setRequests(result.data ?? []);
    } catch (reason) {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setError(reason instanceof Error ? reason.message : "Could not load contact requests.");
      }
    } finally {
      setLoading(false);
    }
  }, [direction]);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadRequests(controller.signal));
    return () => controller.abort();
  }, [loadRequests]);

  async function updateRequest(request: ContactRequest, status: "ACCEPTED" | "DECLINED" | "CANCELLED") {
    setBusyId(request.id);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/contact-requests/${request.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json() as { data?: { conversationId?: string | null }; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not update this request.");
      if (status === "ACCEPTED" && result.data?.conversationId) {
        router.push(`/dashboard/messages?conversation=${result.data.conversationId}`);
        return;
      }
      await loadRequests();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update this request.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <main>
      <div>
        <p className="text-sm font-semibold text-blue-700">Creator connections</p>
        <h1 className="mt-1 text-3xl font-semibold">Hire & collaboration requests</h1>
        <p className="mt-2 text-sm text-neutral-600">Review opportunities, reply to creators, and manage requests you’ve sent.</p>
      </div>
      <div className="mt-6 flex gap-2 border-b">
        {(["incoming", "outgoing"] as const).map((value) => (
          <button key={value} onClick={() => { setLoading(true); setDirection(value); }} className={`border-b-2 px-4 py-3 text-sm font-semibold capitalize ${direction === value ? "border-blue-700 text-blue-800" : "border-transparent text-neutral-500"}`}>
            {value} requests
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-neutral-500">Loading requests…</p> : requests.length === 0 ? (
        <section className="mt-8 rounded-lg border border-dashed bg-white px-6 py-12 text-center">
          <h2 className="font-semibold">No {direction} requests yet</h2>
          <p className="mt-2 text-sm text-neutral-600">{direction === "incoming" ? "When someone wants to hire or collaborate with you, their request will appear here." : "Explore creator profiles and reach out when you find a good fit."}</p>
          {direction === "outgoing" && <Link href="/discover" className="mt-4 inline-flex rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Discover creators</Link>}
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          {requests.map((request) => {
            const person = direction === "incoming" ? request.sender : request.recipient;
            const name = person.profile?.fullName ?? `@${person.username}`;
            return (
              <article key={request.id} className="rounded-lg border bg-white p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{request.type === "HIRE" ? "Hiring request" : "Collaboration request"} · {request.status.toLowerCase()}</p>
                    <h2 className="mt-1 text-lg font-semibold">{request.subject}</h2>
                    <p className="mt-1 text-sm text-neutral-600">{direction === "incoming" ? "From" : "To"} <Link className="font-semibold text-blue-800 hover:underline" href={`/profile/${person.username}`}>{name}</Link>{person.profile?.professionalTitle ? ` · ${person.profile.professionalTitle}` : ""} · {new Date(request.createdAt).toLocaleDateString()}</p>
                  </div>
                  {request.status === "PENDING" && (
                    <div className="flex shrink-0 gap-2">
                      {direction === "incoming" ? (
                        <>
                          <button disabled={busyId === request.id} onClick={() => void updateRequest(request, "DECLINED")} className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-60">Decline</button>
                          <button disabled={busyId === request.id} onClick={() => void updateRequest(request, "ACCEPTED")} className="rounded-md bg-blue-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{busyId === request.id ? "Working…" : "Accept & message"}</button>
                        </>
                      ) : (
                        <button disabled={busyId === request.id} onClick={() => void updateRequest(request, "CANCELLED")} className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-60">Withdraw</button>
                      )}
                    </div>
                  )}
                  {request.status === "ACCEPTED" && direction === "outgoing" && <span className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-800">Accepted</span>}
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{request.message}</p>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
