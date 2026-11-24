import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Bookmark, ArrowRight } from "lucide-react";
import { apiGet, type ProjectSummary } from "../../../lib/api";

export default async function SavedProjectsPage() {
  const cookieHeader = (await cookies()).toString();
  let projects: ProjectSummary[] = [];
  let error = "";
  try {
    projects = await apiGet<ProjectSummary[]>("/api/v1/projects/bookmarks/mine", {
      headers: { cookie: cookieHeader },
    });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Saved projects could not be loaded.";
  }

  return (
    <main>
      <div>
        <p className="text-sm font-semibold text-blue-700">Your collection</p>
        <h1 className="mt-1 text-3xl font-semibold">Saved projects</h1>
        <p className="mt-2 text-sm text-neutral-600">Keep useful work close by for reference, inspiration, or a later conversation.</p>
      </div>
      {error ? (
        <p role="alert" className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
      ) : projects.length === 0 ? (
        <section className="mt-8 rounded-lg border border-dashed bg-white px-6 py-14 text-center">
          <Bookmark className="mx-auto text-neutral-400" size={28} />
          <h2 className="mt-3 text-lg font-semibold">No saved projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-neutral-600">Browse projects and save the ones you want to revisit. They will be collected here.</p>
          <Link href="/discover" className="mt-5 inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Discover projects <ArrowRight size={15} /></Link>
        </section>
      ) : (
        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <Link href={`/projects/${project.slug}`} className="relative block aspect-[16/10] bg-neutral-100">
                {project.coverUrl && <Image src={project.coverUrl} alt="" fill sizes="(max-width:640px) 100vw, (max-width:1280px) 50vw, 33vw" className="object-cover" />}
              </Link>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{project.category?.name ?? "Project"}</p>
                <Link href={`/projects/${project.slug}`} className="mt-2 block text-lg font-semibold hover:text-blue-800">{project.title}</Link>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">{project.shortDescription}</p>
                <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                  <Link href={`/profile/${project.creator.username}`} className="truncate text-sm font-medium">{project.creator.profile?.fullName ?? project.creator.username}</Link>
                  <span className="shrink-0 text-xs text-neutral-500">{project._count.likes} likes</span>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
