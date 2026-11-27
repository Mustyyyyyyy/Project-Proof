"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);

  const loadNotifications = useCallback(async (signal?: AbortSignal) => {
    const [notificationsResponse, meResponse] = await Promise.all([
      fetch(`${API_URL}/api/v1/notifications?pageSize=50`, { credentials: "include", signal }),
      fetch(`${API_URL}/api/v1/auth/me`, { credentials: "include", signal }),
    ]);
    const [notificationsResult, meResult] = await Promise.all([
      notificationsResponse.json() as Promise<{ data?: Notification[]; unread?: number; error?: { message?: string } }>,
      meResponse.json() as Promise<{ data?: { user?: { emailNotifications?: boolean } } }>,
    ]);
    if (!notificationsResponse.ok) throw new Error(notificationsResult.error?.message ?? "Could not load notifications.");
    setNotifications(notificationsResult.data ?? []);
    setUnread(notificationsResult.unread ?? 0);
    setEmailNotifications(meResult.data?.user?.emailNotifications ?? true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => loadNotifications(controller.signal)).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setError(reason instanceof Error ? reason.message : "Could not load notifications.");
      }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [loadNotifications]);

  async function markAllRead() {
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/notifications/read-all`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Could not mark notifications as read.");
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
      setUnread(0);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not mark notifications as read.");
    }
  }

  async function openNotification(notification: Notification) {
    if (!notification.read) {
      try {
        const response = await fetch(`${API_URL}/api/v1/notifications/${notification.id}/read`, {
          method: "POST",
          credentials: "include",
        });
        const result = await response.json() as { error?: { message?: string } };
        if (!response.ok) throw new Error(result.error?.message ?? "Could not mark this notification as read.");
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read: true } : item));
        setUnread((count) => Math.max(0, count - 1));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not mark this notification as read.");
        return;
      }
    }
    if (notification.href) router.push(notification.href);
  }

  async function toggleEmailNotifications() {
    const next = !emailNotifications;
    setEmailNotifications(next);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/notifications/preferences`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailNotifications: next }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Could not update email preferences.");
    } catch (reason) {
      setEmailNotifications(!next);
      setError(reason instanceof Error ? reason.message : "Could not update email preferences.");
    }
  }

  return (
    <main>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-blue-700">Your activity</p><h1 className="mt-1 text-3xl font-semibold">Notifications</h1><p className="mt-2 text-sm text-neutral-600">{unread} unread notification{unread === 1 ? "" : "s"}.</p></div>
        <button disabled={!unread} onClick={() => void markAllRead()} className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold disabled:opacity-50"><CheckCheck size={16} /> Mark all as read</button>
      </div>
      <section className="mt-6 flex flex-col justify-between gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
        <div><h2 className="text-sm font-semibold">Email notifications</h2><p className="mt-1 text-xs text-neutral-600">Receive important requests, messages, and activity in your inbox.</p></div>
        <button role="switch" aria-checked={emailNotifications} onClick={() => void toggleEmailNotifications()} className={`relative h-7 w-12 rounded-full transition ${emailNotifications ? "bg-blue-700" : "bg-neutral-300"}`} aria-label="Toggle email notifications"><span className={`absolute top-1 size-5 rounded-full bg-white transition ${emailNotifications ? "left-6" : "left-1"}`} /></button>
      </section>
      {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-neutral-500">Loading notifications…</p> : notifications.length ? (
        <section className="mt-5 divide-y overflow-hidden rounded-lg border bg-white">
          {notifications.map((notification) => {
            const content = <span className={`flex gap-3 p-4 ${notification.read ? "" : "bg-blue-50/60"}`}>
              <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${notification.read ? "bg-neutral-100 text-neutral-500" : "bg-blue-100 text-blue-800"}`}><Bell size={17} /></span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{notification.title}</span><time className="text-xs text-neutral-500">{new Date(notification.createdAt).toLocaleString()}</time></span>
                {notification.body && <span className="mt-1 block whitespace-pre-line text-sm text-neutral-600">{notification.body}</span>}
              </span>
              {!notification.read && <span aria-label="Unread" className="mt-2 size-2 shrink-0 rounded-full bg-blue-700" />}
            </span>;
            return notification.href
              ? <button key={notification.id} onClick={() => void openNotification(notification)} className="block w-full text-left hover:bg-neutral-50">{content}</button>
              : <article key={notification.id}>{content}</article>;
          })}
        </section>
      ) : <section className="mt-8 rounded-lg border border-dashed bg-white px-6 py-12 text-center"><Bell className="mx-auto text-neutral-400" /><h2 className="mt-3 font-semibold">You’re all caught up</h2><p className="mt-1 text-sm text-neutral-600">New activity and creator updates will appear here.</p></section>}
    </main>
  );
}
