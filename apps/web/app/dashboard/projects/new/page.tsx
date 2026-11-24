"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiGet } from "../../../../lib/api";

interface Category {
  id: string;
  name: string;
}

export default function NewProjectPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<Category[]>("/api/v1/categories")
      .then(setCategories)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Categories could not be loaded."));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const categoryId = String(formData.get("categoryId") || "");
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");
      const response = await fetch(`${apiUrl}/api/v1/projects`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          shortDescription: formData.get("shortDescription"),
          detailedDescription: formData.get("detailedDescription") || undefined,
          categoryId: categoryId || undefined,
          visibility: formData.get("visibility"),
          status: formData.get("status"),
          projectType: formData.get("projectType"),
          location: formData.get("location") || undefined,
          coverUrl: formData.get("coverUrl") || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Project could not be saved.");
      window.location.assign(formData.get("visibility") === "PRIVATE"
        ? "/dashboard/projects"
        : `/projects/${encodeURIComponent(result.data.slug)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Project could not be saved.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl">
        <h1 className="mt-4 text-3xl font-semibold">Add a project</h1>
        <p className="mt-2 text-sm text-neutral-600">Give people a clear view of what you made and why it matters.</p>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-lg border p-6">
          <label className="block text-sm font-semibold">Project title
            <input name="title" required minLength={3} maxLength={120} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
          </label>
          <label className="block text-sm font-semibold">Short description
            <textarea name="shortDescription" required minLength={10} maxLength={280} rows={3} className="mt-2 w-full rounded-md border p-3 font-normal" />
            <span className="mt-1 block text-xs font-normal text-neutral-500">Up to 280 characters.</span>
          </label>
          <label className="block text-sm font-semibold">Project details
            <textarea name="detailedDescription" maxLength={20000} rows={7} className="mt-2 w-full rounded-md border p-3 font-normal" placeholder="Describe the challenge, your approach, and the outcome." />
          </label>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Category
              <select name="categoryId" defaultValue="" className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
                <option value="">Choose a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Status
              <select name="status" defaultValue="COMPLETED" className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
                <option value="COMPLETED">Completed</option><option value="IN_PROGRESS">In progress</option><option value="CONCEPT">Concept</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">Project type
              <select name="projectType" defaultValue="Personal" className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
                {["Personal", "Client project", "Academic", "Professional", "Open source", "Collaborative", "Commercial", "Research", "Other"].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-semibold">Location
            <input name="location" maxLength={120} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" placeholder="Optional" />
          </label>
          <label className="block text-sm font-semibold">Cover image URL
            <input name="coverUrl" type="url" maxLength={2048} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" placeholder="https://" />
          </label>
          <label className="block text-sm font-semibold">Visibility
            <select name="visibility" defaultValue="PUBLIC" className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
              <option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted</option><option value="PRIVATE">Private</option>
            </select>
          </label>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <Link href="/dashboard/projects" className="rounded-md border px-4 py-2.5 text-sm font-semibold">Cancel</Link>
            <button disabled={loading} className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Saving..." : "Save project"}</button>
          </div>
        </form>
    </main>
  );
}
