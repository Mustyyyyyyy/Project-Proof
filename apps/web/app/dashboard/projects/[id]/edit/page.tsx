"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface Category {
  id: string;
  name: string;
}

interface Project {
  id: string;
  title: string;
  shortDescription: string;
  detailedDescription: string | null;
  categoryId: string | null;
  projectType: string;
  status: string;
  visibility: string;
  location: string | null;
  coverUrl: string | null;
}

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [projectId, setProjectId] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    params.then(({ id }) => {
      if (!active) return;
      setProjectId(id);
      return Promise.all([
        fetch(`${API_URL}/api/v1/projects/mine/${encodeURIComponent(id)}`, { credentials: "include" }),
        fetch(`${API_URL}/api/v1/categories`),
      ]);
    }).then(async (responses) => {
      if (!active || !responses) return;
      const [projectResponse, categoryResponse] = responses;
      const projectBody = await projectResponse.json();
      const categoryBody = await categoryResponse.json();
      if (projectResponse.status === 401) throw new Error("Sign in to edit your projects.");
      if (!projectResponse.ok) throw new Error(projectBody.error?.message || "This project could not be loaded.");
      if (!categoryResponse.ok) throw new Error(categoryBody.error?.message || "Project categories could not be loaded.");
      setProject(projectBody.data as Project);
      setCategories(categoryBody.data as Category[]);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "The project could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [params]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${API_URL}/api/v1/projects/${encodeURIComponent(projectId)}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          shortDescription: formData.get("shortDescription"),
          detailedDescription: formData.get("detailedDescription") || null,
          categoryId: formData.get("categoryId") || null,
          projectType: formData.get("projectType"),
          status: formData.get("status"),
          visibility: formData.get("visibility"),
          location: formData.get("location") || null,
          coverUrl: formData.get("coverUrl") || null,
        }),
      });
      const result = await response.json();
      if (response.status === 401) throw new Error("Your session expired. Sign in again to save changes.");
      if (!response.ok) throw new Error(result.error?.message || "Project changes could not be saved.");
      window.location.assign(result.data.visibility === "PRIVATE"
        ? "/dashboard/projects"
        : `/projects/${encodeURIComponent(result.data.slug)}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Project changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="rounded-lg border bg-white p-6 text-sm text-neutral-500">Loading project…</p>;
  if (!project) {
    return <section className="rounded-lg border bg-white p-6"><p role="alert" className="text-sm text-red-700">{error || "Project not found."}</p><Link href="/dashboard/projects" className="mt-4 inline-flex text-sm font-semibold text-blue-700">Back to my projects</Link></section>;
  }

  return (
    <main className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-blue-700">Portfolio / Project</p>
      <h1 className="mt-1 text-3xl font-semibold">Edit project</h1>
      <p className="mt-2 text-sm text-neutral-600">Keep the project details and visibility up to date.</p>
      <form onSubmit={submit} className="mt-7 space-y-5 rounded-lg border bg-white p-5 sm:p-6">
        <label className="block text-sm font-semibold">Project title
          <input name="title" required minLength={3} maxLength={120} defaultValue={project.title} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">Short description
          <textarea name="shortDescription" required minLength={10} maxLength={280} rows={3} defaultValue={project.shortDescription} className="mt-2 w-full rounded-md border p-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">Project details
          <textarea name="detailedDescription" maxLength={20000} rows={7} defaultValue={project.detailedDescription ?? ""} className="mt-2 w-full rounded-md border p-3 font-normal" />
        </label>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Category
            <select name="categoryId" defaultValue={project.categoryId ?? ""} className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
              <option value="">Uncategorized</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">Project type
            <select name="projectType" defaultValue={project.projectType} className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
              {!["Personal", "Client project", "Academic", "Professional", "Open source", "Collaborative", "Commercial", "Research", "Other"].includes(project.projectType) && <option value={project.projectType}>{project.projectType}</option>}
              {["Personal", "Client project", "Academic", "Professional", "Open source", "Collaborative", "Commercial", "Research", "Other"].map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold">Status
            <select name="status" defaultValue={project.status} className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
              <option value="COMPLETED">Completed</option><option value="IN_PROGRESS">In progress</option><option value="CONCEPT">Concept</option><option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <label className="block text-sm font-semibold">Visibility
            <select name="visibility" defaultValue={project.visibility} className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
              <option value="PUBLIC">Public</option><option value="UNLISTED">Unlisted</option><option value="PRIVATE">Private</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold">Location
          <input name="location" maxLength={120} defaultValue={project.location ?? ""} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
        </label>
        <label className="block text-sm font-semibold">Cover image URL
          <input name="coverUrl" type="url" maxLength={2048} defaultValue={project.coverUrl ?? ""} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" placeholder="https://" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-3 border-t pt-5">
          <Link href="/dashboard/projects" className="rounded-md border px-4 py-2.5 text-sm font-semibold">Cancel</Link>
          <button disabled={saving} className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </main>
  );
}
