import Image from "next/image";
import Link from "next/link";
import { Navbar } from "../../components/navbar";
import { apiGet, type ProjectSummary } from "../../lib/api";

interface SearchProfile {
  id: string;
  fullName: string;
  professionalTitle: string | null;
  location: string | null;
  avatarUrl: string | null;
  user: { username: string };
}

interface SearchResult {
  projects: ProjectSummary[];
  professionals: SearchProfile[];
  categories: { id: string; name: string; slug: string }[];
  skills: { id: string; name: string; slug: string }[];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  let results: SearchResult | null = null;
  let error = "";
  if (query) {
    try {
      results = await apiGet<SearchResult>(`/api/v1/search?q=${encodeURIComponent(query)}`, undefined, { revalidateSeconds: 30 });
    } catch (reason) {
      error = reason instanceof Error ? reason.message : "Search could not be completed.";
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <form action="/search" className="flex items-center rounded-md border p-2">
          <label className="sr-only" htmlFor="search-query">Search projects and professionals</label>
          <input id="search-query" name="q" defaultValue={query} className="h-11 flex-1 px-3 outline-none" placeholder="Search projects, people, skills..." />
          <button className="rounded-md bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white">Search</button>
        </form>
        <div className="mt-8">
          <h1 className="text-3xl font-semibold">Search results{query ? ` for “${query}”` : ""}</h1>
          {!query ? (
            <p className="mt-4 text-neutral-500">Enter a search term to find projects, professionals, skills, and categories.</p>
          ) : error ? (
            <p role="alert" className="mt-5 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
          ) : results ? (
            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_260px]">
              <section>
                <h2 className="text-xl font-semibold">Projects <span className="ml-1 text-sm font-normal text-neutral-500">{results.projects.length}</span></h2>
                {results.projects.length === 0 ? (
                  <p className="mt-4 text-sm text-neutral-500">No matching projects found.</p>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    {results.projects.map((project) => (
                      <article key={project.id} className="overflow-hidden rounded-lg border">
                        <Link href={`/projects/${project.slug}`}>
                          <div className="relative aspect-[16/10] bg-neutral-100">
                            {project.coverUrl && <Image src={project.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />}
                          </div>
                        </Link>
                        <div className="p-4">
                          <Link href={`/projects/${project.slug}`} className="font-semibold">{project.title}</Link>
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                          <Link href={`/profile/${project.creator.username}`} className="mt-3 block text-sm text-neutral-500">
                            By {project.creator.profile?.fullName ?? project.creator.username}
                          </Link>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <h2 className="mt-10 text-xl font-semibold">Professionals <span className="ml-1 text-sm font-normal text-neutral-500">{results.professionals.length}</span></h2>
                <div className="mt-4 divide-y border-y">
                  {results.professionals.map((person) => (
                    <Link key={person.id} href={`/profile/${person.user.username}`} className="flex items-center gap-3 py-4">
                      {person.avatarUrl ? (
                        <Image src={person.avatarUrl} alt="" width={40} height={40} className="size-10 rounded-full object-cover" />
                      ) : (
                        <span className="grid size-10 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white">{person.fullName.slice(0, 2).toUpperCase()}</span>
                      )}
                      <span><span className="block font-semibold">{person.fullName}</span><span className="text-sm text-neutral-500">{[person.professionalTitle, person.location].filter(Boolean).join(" · ")}</span></span>
                    </Link>
                  ))}
                  {results.professionals.length === 0 && <p className="py-4 text-sm text-neutral-500">No matching professionals found.</p>}
                </div>
              </section>
              <aside className="space-y-6">
                <section><h2 className="font-semibold">Categories</h2><div className="mt-3 flex flex-wrap gap-2">{results.categories.map((item) => <Link key={item.id} href={`/discover?category=${item.slug}`} className="rounded-md bg-neutral-100 px-3 py-2 text-sm">{item.name}</Link>)}</div></section>
                <section><h2 className="font-semibold">Skills</h2><div className="mt-3 flex flex-wrap gap-2">{results.skills.map((item) => <span key={item.id} className="rounded-md border px-3 py-2 text-sm">{item.name}</span>)}</div></section>
              </aside>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}
