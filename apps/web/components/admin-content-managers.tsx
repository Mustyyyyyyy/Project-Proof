"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface Opportunity {
  id: string;
  title: string;
  company: string;
  description: string;
  type: string;
  location: string | null;
  remote: boolean;
  compensation: string | null;
  deadline: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { projects: number };
}

const opportunityTypes = [
  ["FULL_TIME", "Full-time"], ["PART_TIME", "Part-time"], ["FREELANCE", "Freelance"],
  ["INTERNSHIP", "Internship"], ["CONTRACT", "Contract"], ["COLLABORATION", "Collaboration"],
  ["VOLUNTEER", "Volunteer"], ["SCHOLARSHIP", "Scholarship"], ["PROJECT_BASED", "Project-based"],
];

export function AdminOpportunityManager({ initial }: { initial: Opportunity[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const deadlineValue = String(formData.get("deadline") || "");
    const payload = {
      title: formData.get("title"),
      company: formData.get("company"),
      description: formData.get("description"),
      type: formData.get("type"),
      location: formData.get("location") || null,
      remote: formData.get("remote") === "on",
      compensation: formData.get("compensation") || null,
      deadline: deadlineValue ? new Date(`${deadlineValue}T23:59:59`).toISOString() : null,
    };
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/opportunities${editing ? `/${encodeURIComponent(editing.id)}` : ""}`, {
        method: editing ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = response.status === 204 ? null : await response.json();
      if (!response.ok) throw new Error(result?.error?.message || "Opportunity could not be saved.");
      setEditing(null);
      form.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Opportunity could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Permanently remove this opportunity?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/opportunities/${encodeURIComponent(id)}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Opportunity could not be removed.");
      }
      if (editing?.id === id) setEditing(null);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Opportunity could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(opportunity: Opportunity) {
    setEditing(opportunity);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-7">
      <form key={editing?.id ?? "new-opportunity"} onSubmit={submit} className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold">{editing ? "Edit opportunity" : "Add an opportunity"}</h2><p className="mt-1 text-sm text-neutral-600">This information appears on the public opportunities board.</p></div>{editing && <button type="button" onClick={() => setEditing(null)} className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">Cancel edit</button>}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Title<input name="title" required minLength={3} maxLength={160} defaultValue={editing?.title} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Company or organization<input name="company" required maxLength={120} defaultValue={editing?.company} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label>
          <label className="text-sm font-semibold">Type<select name="type" defaultValue={editing?.type ?? "FULL_TIME"} className="mt-2 h-10 w-full rounded-md border bg-white px-3 font-normal">{opportunityTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm font-semibold">Location<input name="location" maxLength={120} defaultValue={editing?.location ?? ""} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" placeholder="Optional" /></label>
          <label className="text-sm font-semibold">Compensation<input name="compensation" maxLength={160} defaultValue={editing?.compensation ?? ""} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" placeholder="Optional" /></label>
          <label className="text-sm font-semibold">Deadline<input name="deadline" type="date" defaultValue={editing?.deadline ? new Date(editing.deadline).toISOString().slice(0, 10) : ""} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label>
          <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input name="remote" type="checkbox" defaultChecked={editing?.remote} className="size-4 accent-blue-700" /> Remote opportunity</label>
          <label className="text-sm font-semibold sm:col-span-2">Description<textarea name="description" required minLength={10} maxLength={10000} rows={4} defaultValue={editing?.description} className="mt-2 w-full rounded-md border p-3 font-normal" /></label>
        </div>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-5 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving…" : editing ? "Save changes" : "Publish opportunity"}</button>
      </form>

      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="flex justify-between border-b px-5 py-4"><h2 className="font-semibold">Published opportunities</h2><span className="text-sm text-neutral-500">{initial.length} total</span></div>
        {initial.length ? <div className="divide-y">{initial.map((opportunity) => <article key={opportunity.id} className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"><div><h3 className="font-semibold">{opportunity.title}</h3><p className="mt-1 text-sm text-neutral-600">{opportunity.company} · {opportunity.type.replaceAll("_", " ")}{opportunity.remote ? " · Remote" : ""}</p><p className="mt-1 text-xs text-neutral-500">{opportunity.location ?? "Location not specified"}{opportunity.deadline ? ` · Deadline ${new Date(opportunity.deadline).toLocaleDateString()}` : ""}</p></div><div className="flex gap-2"><button disabled={busy} onClick={() => startEdit(opportunity)} className="rounded-md border px-3 py-2 text-xs font-semibold">Edit</button><button disabled={busy} onClick={() => void remove(opportunity.id)} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-800">Remove</button></div></article>)}</div> : <p className="p-8 text-center text-sm text-neutral-500">No opportunities have been published.</p>}
      </section>
    </div>
  );
}

export function AdminCategoryManager({ initial }: { initial: Category[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function updateName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/categories`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Category could not be created.");
      setName("");
      setSlug("");
      setSlugEdited(false);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Category could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: Category) {
    if (!window.confirm(`Remove "${category.name}"? Projects in this category will become uncategorized.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/categories/${encodeURIComponent(category.id)}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || "Category could not be removed.");
      }
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Category could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.4fr]">
      <form onSubmit={create} className="h-fit rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-semibold">Add category</h2>
        <label className="mt-5 block text-sm font-semibold">Name<input required minLength={2} maxLength={80} value={name} onChange={(event) => updateName(event.target.value)} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label>
        <label className="mt-4 block text-sm font-semibold">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={slug} onChange={(event) => { setSlugEdited(true); setSlug(event.target.value); }} className="mt-2 h-10 w-full rounded-md border px-3 font-normal" /></label>
        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="mt-5 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">Add category</button>
      </form>
      <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="flex justify-between border-b px-5 py-4"><h2 className="font-semibold">Project categories</h2><span className="text-sm text-neutral-500">{initial.length} total</span></div>
        {initial.length ? <div className="divide-y">{initial.map((category) => <article key={category.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><h3 className="font-semibold">{category.name}</h3><p className="mt-1 text-xs text-neutral-500">/{category.slug} · {category._count.projects} projects</p></div><button disabled={busy} onClick={() => void remove(category)} className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-800">Remove</button></article>)}</div> : <p className="p-8 text-center text-sm text-neutral-500">No categories yet.</p>}
      </section>
    </div>
  );
}
