"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface Conversation {
  id: string;
  otherUser: { id: string; username: string; profile: { fullName: string; avatarUrl: string | null } | null };
  lastMessage: Message | null;
  unreadCount: number;
}
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  sender?: { id: string; username: string };
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeId, setActiveId] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${API_URL}/api/v1/messages/conversations`, { credentials: "include", signal });
    const result = await response.json() as { data?: Conversation[]; error?: { message?: string } };
    if (!response.ok) throw new Error(result.error?.message ?? "Could not load conversations.");
    setConversations(result.data ?? []);
    return result.data ?? [];
  }, []);

  const loadMessages = useCallback(async (conversationId: string, signal?: AbortSignal) => {
    const response = await fetch(`${API_URL}/api/v1/messages/conversations/${conversationId}/messages`, { credentials: "include", signal });
    const result = await response.json() as { data?: Message[]; error?: { message?: string } };
    if (!response.ok) throw new Error(result.error?.message ?? "Could not load messages.");
    setMessages(result.data ?? []);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const queryId = new URLSearchParams(window.location.search).get("conversation") ?? "";
    void Promise.resolve().then(() => Promise.all([
      fetch(`${API_URL}/api/v1/auth/me`, { credentials: "include", signal: controller.signal }).then((response) => response.json()),
      loadConversations(controller.signal),
    ])).then(async ([session, rows]) => {
      setCurrentUserId(session.data?.user?.id ?? "");
      const selectedId = queryId && rows.some((row) => row.id === queryId) ? queryId : (rows[0]?.id ?? "");
      if (selectedId) {
        setActiveId(selectedId);
        await loadMessages(selectedId, controller.signal);
      }
    }).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === "AbortError")) {
        setError(reason instanceof Error ? reason.message : "Could not load messages.");
      }
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [loadConversations, loadMessages]);

  useEffect(() => {
    if (!activeId) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => {
      void Promise.all([loadMessages(activeId, controller.signal), loadConversations(controller.signal)])
        .catch((reason: unknown) => {
          if (!(reason instanceof DOMException && reason.name === "AbortError")) {
            console.error("Could not refresh messages:", reason);
          }
        });
    }, 12000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [activeId, loadConversations, loadMessages]);

  async function selectConversation(id: string) {
    setActiveId(id);
    window.history.replaceState(null, "", `/dashboard/messages?conversation=${encodeURIComponent(id)}`);
    setError("");
    try {
      await loadMessages(id);
      await loadConversations();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load this conversation.");
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeId || !body.trim()) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/messages/conversations/${activeId}/messages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json() as { data?: Message; error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? "Message could not be sent.");
      setBody("");
      await Promise.all([loadMessages(activeId), loadConversations()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  const active = conversations.find((conversation) => conversation.id === activeId);

  return (
    <main>
      <div>
        <p className="text-sm font-semibold text-blue-700">Creator connections</p>
        <h1 className="mt-1 text-3xl font-semibold">Messages</h1>
        <p className="mt-2 text-sm text-neutral-600">Continue conversations with creators after a request has been accepted.</p>
      </div>
      {error && <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {loading ? <p className="mt-8 text-sm text-neutral-500">Loading messages…</p> : (
        <section className="mt-6 grid min-h-[560px] overflow-hidden rounded-lg border bg-white md:grid-cols-[280px_1fr]">
          <aside className="border-b md:border-b-0 md:border-r">
            <h2 className="border-b px-4 py-3 text-sm font-semibold">Conversations</h2>
            {conversations.length ? conversations.map((conversation) => (
              <button key={conversation.id} onClick={() => void selectConversation(conversation.id)} className={`w-full border-b px-4 py-4 text-left hover:bg-neutral-50 ${activeId === conversation.id ? "bg-blue-50" : ""}`}>
                <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{conversation.otherUser.profile?.fullName ?? `@${conversation.otherUser.username}`}</span>{conversation.unreadCount > 0 && <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-700 text-xs text-white">{conversation.unreadCount}</span>}</span>
                <span className="mt-1 block truncate text-xs text-neutral-500">{conversation.lastMessage?.body ?? "No messages yet"}</span>
              </button>
            )) : <p className="px-4 py-8 text-sm text-neutral-500">You don’t have any conversations yet. Accept a creator request to start messaging.</p>}
          </aside>
          <section className="flex min-h-[440px] flex-col">
            {active ? (
              <>
                <header className="border-b px-5 py-4">
                  <h2 className="font-semibold">{active.otherUser.profile?.fullName ?? `@${active.otherUser.username}`}</h2>
                  <Link href={`/profile/${active.otherUser.username}`} className="text-xs text-blue-700 hover:underline">View creator profile</Link>
                </header>
                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                  {messages.map((message) => {
                    const mine = message.senderId === currentUserId;
                    return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-2.5 ${mine ? "bg-blue-700 text-white" : "bg-neutral-100 text-neutral-900"}`}>
                        <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                        <time className={`mt-1 block text-right text-[10px] ${mine ? "text-blue-100" : "text-neutral-500"}`}>{new Date(message.createdAt).toLocaleString()}</time>
                      </div>
                    </div>;
                  })}
                  {!messages.length && <p className="text-sm text-neutral-500">No messages yet. Start the conversation.</p>}
                </div>
                <form onSubmit={(event) => void sendMessage(event)} className="flex items-end gap-2 border-t p-4">
                  <textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={2} placeholder="Write a message…" className="min-h-11 flex-1 resize-y rounded-md border px-3 py-2 text-sm" />
                  <button disabled={sending || !body.trim()} className="h-11 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{sending ? "Sending…" : "Send"}</button>
                </form>
              </>
            ) : <div className="grid flex-1 place-items-center p-8 text-center text-sm text-neutral-500">Choose an existing conversation to read and reply.</div>}
          </section>
        </section>
      )}
    </main>
  );
}
