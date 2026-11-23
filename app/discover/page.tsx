import Image from "next/image";
import Link from "next/link";
import { Bookmark, Eye, Heart, Search, SlidersHorizontal } from "lucide-react";
import { Navbar } from "../../components/navbar";
import { apiGet, type ProjectSummary } from "../../lib/api";

const categories = [
  ["All projects", ""],
  ["Product design", "product-design"],
  ["Software", "software-development"],
  ["Architecture", "architecture"],
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category = "" } = await searchParams;
  const query = category ? `?category=${encodeURIComponent(category)}` : "";
  let projects: ProjectSummary[] = [];
  let error = "";
  try {
    projects = await apiGet<ProjectSummary[]>(`/api/v1/projects${query}`);
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Projects could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-700">Explore</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Discover real work</h1>
          <p className="mt-3 text-neutral-600">Find projects, people, and the skills behind exceptional work.</p>
        </div>
        <form action="/search" className="mb-6 flex items-center rounded-md border border-neutral-200 bg-white p-2">
          <Search className="ml-2 text-neutral-400" size={20} />
          <input name="q" className="h-10 flex-1 px-3 outline-none" placeholder="Search projects, people, skills, or categories..." />
          <button className="rounded-md bg-neutral-950 px-4 py-2.5 text-sm font-semibold text-white">Search</button>
        </form>
        <div className="mb-8 flex gap-2 overflow-x-auto">
          {categories.map(([label, slug]) => (
            <Link
              key={label}
              href={slug ? `/discover?category=${slug}` : "/discover"}
              className={`whitespace-nowrap rounded-md border px-4 py-2 text-sm ${category === slug ? "border-neutral-950 bg-neutral-950 font-semibold text-white" : "border-neutral-200"}`}
            >
              {label}
            </Link>
          ))}
        </div>
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
          <aside className="h-fit rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center gap-2 font-semibold"><SlidersHorizontal size={17} /> Filters</div>
            <p className="mt-4 text-sm text-neutral-500">Filter by category above. More project filters are coming as the listing API expands.</p>
          </aside>
        </div>
      </main>
    </>
  );
}
