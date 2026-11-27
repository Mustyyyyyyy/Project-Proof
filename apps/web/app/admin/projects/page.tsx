import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { AdminProjectControls } from "../../../components/admin-moderation-controls";
import { apiGet } from "../../../lib/api";

interface AdminProject {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverUrl: string | null;
  visibility: string;
  deletedAt: string | null;
  updatedAt: string;
  category: { name: string } | null;
  creator: { id: string; username: string; email: string };
  _count: { reports: number };
}
interface ProjectsResponse {
  data: AdminProject[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
}

export default async function AdminProjectsPage({ searchParams }: { searchParams: Promise<{ q?: string; includeDeleted?: string; page?: string }> }) {
  const { q = "", includeDeleted = "false", page = "1" } = await searchParams;
  const params = new URLSearchParams({ page, pageSize: "30", includeDeleted });
  if (q) params.set("q", q);
  let result: ProjectsResponse | null = null;
  let error = "";
  try {
    result = await apiGet<ProjectsResponse>(`/api/v1/admin/projects?${params}`, { headers: { cookie: (await cookies()).toString() } });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Projects could not be loaded.";
  }
  return (
    <div>
      <header><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold">Projects</h1><p className="mt-2 text-sm text-neutral-600">Review published work, control visibility, and remove or restore projects.</p></header>
      <form action="/admin/projects" className="mt-6 flex flex-col gap-3 sm:flex-row">
        <input name="q" defaultValue={q} className="h-10 min-w-0 flex-1 rounded-md border px-3 text-sm" placeholder="Search project or creator" />
        <select name="includeDeleted" defaultValue={includeDeleted} className="h-10 rounded-md border bg-white px-3 text-sm"><option value="false">Active projects</option><option value="true">Include removed projects</option></select>
        <button className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Filter</button>
      </form>
      {error ? <p role="alert" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p> : result && <section className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <div className="flex justify-between border-b px-5 py-4"><h2 className="font-semibold">Projects</h2><span className="text-sm text-neutral-500">{result.pagination.total} results</span></div>
        {result.data.length ? <div className="divide-y">{result.data.map((project) => {
          const deleted = Boolean(project.deletedAt);
          return <article key={project.id} className="grid gap-4 px-4 py-4 sm:grid-cols-[72px_1fr_auto] sm:items-center sm:px-5">
            <Link href={`/projects/${project.slug}`} className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-neutral-100 sm:size-[72px]">{project.coverUrl && <Image src={project.coverUrl} alt="" fill sizes="72px" className="object-cover" />}</Link>
            <div className="min-w-0"><Link href={`/projects/${project.slug}`} className="font-semibold hover:text-blue-800">{project.title}</Link><p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p><p className="mt-1 text-xs text-neutral-500">{project.category?.name ?? "Uncategorized"} · @{project.creator.username} · {project._count.reports} open reports{deleted ? " · Removed" : ""}</p></div>
            <AdminProjectControls projectId={project.id} visibility={project.visibility} deleted={deleted} />
          </article>;
        })}</div> : <p className="p-8 text-center text-sm text-neutral-500">No projects match these filters.</p>}
        {result.pagination.pages > 1 && <div className="flex items-center justify-between border-t px-5 py-4 text-sm">
          {result.pagination.page > 1 ? <Link href={`/admin/projects?${new URLSearchParams({ q, includeDeleted, page: String(result.pagination.page - 1) })}`} className="font-semibold text-blue-700">Previous</Link> : <span />}
          <span className="text-neutral-500">Page {result.pagination.page} of {result.pagination.pages}</span>
          {result.pagination.page < result.pagination.pages ? <Link href={`/admin/projects?${new URLSearchParams({ q, includeDeleted, page: String(result.pagination.page + 1) })}`} className="font-semibold text-blue-700">Next</Link> : <span />}
        </div>}
      </section>}
    </div>
  );
}
