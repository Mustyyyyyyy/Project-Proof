import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Plus } from "lucide-react";
import { DeleteProjectButton } from "../../../components/delete-project-button";
import { apiGet, type ProjectSummary } from "../../../lib/api";

interface ManagedProject extends ProjectSummary {
  status: string;
  visibility: string;
  updatedAt: string;
  createdAt: string;
}

export default async function MyProjectsPage() {
  const cookieHeader = (await cookies()).toString();
  let projects: ManagedProject[] = [];
  let error = "";
  try {
    projects = await apiGet<ManagedProject[]>("/api/v1/projects/mine", {
      headers: { cookie: cookieHeader },
    });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Your projects could not be loaded.";
  }

  return (
    <main>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-blue-700">Portfolio</p><h1 className="mt-1 text-3xl font-semibold">My projects</h1><p className="mt-2 text-sm text-neutral-600">Create, update, and curate the work on your public profile.</p></div>
        <Link href="/dashboard/projects/new" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white"><Plus size={16} /> Add project</Link>
      </div>
      {error ? (
        <p role="alert" className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
      ) : projects.length === 0 ? (
        <section className="mt-8 rounded-lg border border-dashed bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold">Your portfolio is ready for its first project</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-neutral-600">Share a finished result, explain your process, and give people a way to understand your contribution.</p>
          <Link href="/dashboard/projects/new" className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> Create a project</Link>
        </section>
      ) : (
        <section className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">{projects.length} {projects.length === 1 ? "project" : "projects"}</h2><span className="text-xs text-neutral-500">Most recently updated first</span></div>
          <div className="divide-y divide-neutral-100">
            {projects.map((project) => (
              <article key={project.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
                <Link href={`/projects/${project.slug}`} className="relative aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md bg-neutral-100 sm:aspect-square sm:size-20">
                  {project.coverUrl && <Image src={project.coverUrl} alt="" fill sizes="(max-width:640px) 100vw, 80px" className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/projects/${project.slug}`} className="font-semibold hover:text-blue-800">{project.title}</Link>
                  <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                  <p className="mt-2 text-xs text-neutral-500">{project.category?.name ?? "Uncategorized"} · {project._count.likes} likes · Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">{project.visibility === "PUBLIC" ? "Published" : project.visibility === "PRIVATE" ? "Private" : "Unlisted"}</span>
                  <Link href={`/dashboard/projects/${project.id}/edit`} className="rounded-md border px-3 py-2 text-xs font-semibold hover:bg-neutral-50">Edit</Link>
                  {project.visibility !== "PRIVATE" && <Link href={`/projects/${project.slug}`} className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-neutral-50">View <ArrowRight size={13} /></Link>}
                  <DeleteProjectButton projectId={project.id} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
