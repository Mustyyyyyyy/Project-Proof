import Image from "next/image";
import Link from "next/link";
import { Bookmark, Eye, Heart, Search, SlidersHorizontal } from "lucide-react";
import { Navbar } from "../../components/navbar";
import { apiGetResult, type ApiResult, type ProjectSummary } from "../../lib/api";

const categories = [
  ["All projects", ""],
  ["Product design", "product-design"],
  ["Software", "software-development"],
  ["Architecture", "architecture"],
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string; page?: string }>;
}) {
  const { category = "", q = "", sort = "latest", page: pageParam = "1" } = await searchParams;
  const query = q.trim();
  const page = Number.isInteger(Number(pageParam)) && Number(pageParam) > 0 ? Number(pageParam) : 1;
  const selectedSort = ["latest", "popular", "most-viewed"].includes(sort) ? sort : "latest";
  const params = new URLSearchParams({ page: String(page), pageSize: "12", sort: selectedSort });
  if (category) params.set("category", category);
  if (query) params.set("q", query);
  let projects: ProjectSummary[] = [];
  let pagination: ApiResult<ProjectSummary[]>["pagination"];
  let error = "";
  try {
    const result = await apiGetResult<ProjectSummary[]>(`/api/v1/projects?${params}`, undefined, { revalidateSeconds: 30 });
    projects = result.data ?? [];
    pagination = result.pagination;
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Projects could not be loaded.";
  }
  const pageLink = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(nextPage));
    return `/discover?${next}`;
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-700">Explore</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Discover real work</h1>
          <p className="mt-3 text-neutral-600">Find projects, people, and the skills behind exceptional work.</p>
        </div>
        <form action="/discover" className="mb-6 grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_200px_180px_auto]">
          <label className="sr-only" htmlFor="project-query">Search projects and creators</label>
          <div className="flex items-center rounded-md border border-neutral-200 px-3">
            <Search className="shrink-0 text-neutral-400" size={18} />
            <input id="project-query" name="q" defaultValue={query} className="h-11 min-w-0 flex-1 px-3 text-sm outline-none" placeholder="Search projects or creators" />
          </div>
          <label className="sr-only" htmlFor="project-category">Category</label>
          <select id="project-category" name="category" defaultValue={category} className="h-11 rounded-md border border-neutral-200 bg-white px-3 text-sm">
            {categories.map(([label, slug]) => <option key={label} value={slug}>{label}</option>)}
          </select>
          <label className="sr-only" htmlFor="project-sort">Sort projects</label>
          <select id="project-sort" name="sort" defaultValue={selectedSort} className="h-11 rounded-md border border-neutral-200 bg-white px-3 text-sm">
            <option value="latest">Recently published</option>
            <option value="popular">Most liked</option>
            <option value="most-viewed">Most viewed</option>
          </select>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white"><SlidersHorizontal size={16} /> Apply</button>
        </form>
        <div className="grid gap-7 lg:grid-cols-[1fr_220px]">
          <div>
            {error ? (
              <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</div>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-dashed p-12 text-center">
                <h2 className="font-semibold">No projects here yet</h2>
                <p className="mt-2 text-sm text-neutral-500">Try another category or check back as creators publish their work.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                {projects.map((project) => {
                  const creator = project.creator.profile;
                  return (
                    <article key={project.id} className="overflow-hidden rounded-lg border border-neutral-200">
                      <Link href={`/projects/${project.slug}`} aria-label={`View ${project.title}`}>
                        <div className="relative aspect-[16/10] bg-neutral-100">
                          {project.coverUrl && <Image src={project.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />}
                        </div>
                      </Link>
                      <div className="p-5">
                        <Link href={`/projects/${project.slug}`}>
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{project.category?.name ?? "Project"}</p>
                          <h2 className="mt-2 text-lg font-semibold">{project.title}</h2>
                        </Link>
                        <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                        <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
                          {creator?.avatarUrl ? (
                            <Image src={creator.avatarUrl} alt="" width={36} height={36} className="size-9 rounded-full object-cover" />
                          ) : (
                            <span className="grid size-9 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                              {(creator?.fullName ?? project.creator.username).slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <Link href={`/profile/${project.creator.username}`} className="min-w-0">
                            <p className="truncate text-sm font-semibold">{creator?.fullName ?? project.creator.username}</p>
                            <p className="truncate text-xs text-neutral-500">
                              {[creator?.professionalTitle, creator?.location, creator?.country].filter(Boolean).join(" · ") || `@${project.creator.username}`}
                            </p>
                          </Link>
                        </div>
                        <div className="mt-4 flex items-center gap-5 text-sm text-neutral-500">
                          <span className="flex items-center gap-1"><Heart size={15} />{project._count.likes}</span>
                          <span className="flex items-center gap-1"><Eye size={15} />{project.viewCount}</span>
                          <Bookmark className="ml-auto" size={16} aria-hidden="true" />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <aside className="h-fit rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={17} /> Explore work</div>
            <p className="mt-3 text-sm leading-6 text-neutral-600">Search project titles, descriptions, categories, and creator names. Sort by recency, likes, or views.</p>
            {pagination && <p className="mt-4 border-t pt-4 text-xs text-neutral-500">{pagination.total.toLocaleString()} public {pagination.total === 1 ? "project" : "projects"}</p>}
          </aside>
        </div>
        {pagination && pagination.pages > 1 && (
          <nav aria-label="Project pages" className="mt-8 flex items-center justify-between border-t border-neutral-200 pt-5">
            <p className="text-sm text-neutral-600">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              {pagination.page > 1
                ? <Link href={pageLink(pagination.page - 1)} rel="prev" className="rounded-md border px-4 py-2 text-sm font-semibold hover:bg-white">Previous</Link>
                : <span aria-disabled="true" className="rounded-md border px-4 py-2 text-sm font-semibold text-neutral-400">Previous</span>}
              {pagination.page < pagination.pages
                ? <Link href={pageLink(pagination.page + 1)} rel="next" className="rounded-md bg-neutral-950 px-4 py-2 text-sm font-semibold text-white">Next</Link>
                : <span aria-disabled="true" className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-500">Next</span>}
            </div>
          </nav>
        )}
      </main>
    </>
  );
}
