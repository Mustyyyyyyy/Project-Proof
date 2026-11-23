import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, Code2, Palette, Camera, Building2 } from "lucide-react";
import { Navbar } from "../components/navbar";
import { ProjectActions } from "../components/project-actions";
import { apiGet, type ProjectSummary } from "../lib/api";

interface FeaturedProfessional {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
  avatarUrl: string | null;
  location: string | null;
  country: string | null;
  projectCount: number;
}
const categories = [["Software", "software-development", Code2], ["Product Design", "product-design", Palette], ["Photography", "photography", Camera], ["Architecture", "architecture", Building2]] as const;

export default async function Home() {
  let projects: ProjectSummary[] = [];
  let professionals: FeaturedProfessional[] = [];
  let projectError = "";
  let professionalError = "";
  try {
    projects = await apiGet<ProjectSummary[]>("/api/v1/projects?pageSize=3");
  } catch (reason) {
    projectError = reason instanceof Error ? reason.message : "Featured projects could not be loaded.";
  }
  try {
    professionals = await apiGet<FeaturedProfessional[]>("/api/v1/profiles?limit=3");
  } catch (reason) {
    professionalError = reason instanceof Error ? reason.message : "Professionals could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-neutral-200 bg-neutral-50">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">
            <div className="min-w-0 max-w-2xl">
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Proof over promises</p>
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-neutral-950 sm:text-6xl">Your work deserves more than a CV.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">Showcase real projects, discover talented people, and connect with opportunities that value what you can actually do.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link href="/register" className="rounded-md bg-blue-700 px-5 py-3.5 text-center text-sm font-semibold text-white">Create your portfolio <ArrowRight className="ml-2 inline" size={17}/></Link><Link href="/discover" className="rounded-md border border-neutral-300 bg-white px-5 py-3.5 text-center text-sm font-semibold">Explore projects</Link></div>
            </div>
            <form action="/search" className="min-w-0 self-end rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
              <label className="sr-only" htmlFor="hero-search">Search</label><div className="flex min-w-0 items-center"><Search className="ml-3 shrink-0 text-neutral-400" size={20}/><input id="hero-search" name="q" className="h-14 min-w-0 flex-1 px-3 outline-none" placeholder="Search projects, people, skills, or categories..."/><button className="shrink-0 rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Search</button></div>
            </form>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-semibold text-blue-700">Discover</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Featured projects</h2></div><Link href="/discover" className="hidden text-sm font-semibold sm:block">View all <ArrowRight className="ml-1 inline" size={15}/></Link></div>
          {projectError ? (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{projectError}</p>
          ) : projects.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-sm text-neutral-500">No public projects have been published yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => {
                const creator = project.creator.profile;
                return (
                  <article key={project.id} className="group overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <Link href={`/projects/${project.slug}`} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                        {project.coverUrl && <Image src={project.coverUrl} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.02]" sizes="(max-width:768px) 100vw, 33vw" />}
                      </div>
                    </Link>
                    <div className="p-5">
                      <Link href={`/projects/${project.slug}`}>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{project.category?.name ?? "Project"}</p>
                        <h3 className="mt-2 text-xl font-semibold">{project.title}</h3>
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                      <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
                        <span className="grid size-9 place-items-center rounded-full bg-neutral-900 text-xs font-bold text-white">{(creator?.fullName ?? project.creator.username).slice(0, 2).toUpperCase()}</span>
                        <Link href={`/profile/${project.creator.username}`} className="min-w-0">
                          <p className="truncate text-sm font-semibold">{creator?.fullName ?? project.creator.username}</p>
                          <p className="truncate text-xs text-neutral-500">{[creator?.professionalTitle, creator?.location, creator?.country].filter(Boolean).join(" · ") || `@${project.creator.username}`}</p>
                        </Link>
                      </div>
                      <ProjectActions projectId={project.id} initialLikes={project._count.likes} />
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
          <div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-semibold text-blue-700">Meet the makers</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Featured professionals</h2></div><Link href="/professionals" className="text-sm font-semibold">View directory <ArrowRight className="ml-1 inline" size={15}/></Link></div>
          {professionalError ? (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{professionalError}</p>
          ) : professionals.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-sm text-neutral-500">No public professional profiles are available yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {professionals.map((person) => (
                <Link key={person.id} href={`/profile/${person.username}`} className="rounded-lg border p-5 transition hover:border-neutral-400">
                  <span className="grid size-12 place-items-center rounded-full bg-neutral-900 text-sm font-bold text-white">{person.fullName.slice(0, 2).toUpperCase()}</span>
                  <h3 className="mt-4 font-semibold">{person.fullName}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{person.professionalTitle ?? "Professional"}</p>
                  <p className="mt-2 text-xs text-neutral-500">{[person.location, person.country].filter(Boolean).join(", ")} · {person.projectCount} projects</p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="border-y border-neutral-200 bg-neutral-950 py-16 text-white"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-8"><p className="text-sm font-semibold text-blue-400">Explore</p><h2 className="mt-2 text-3xl font-semibold">Browse by discipline</h2></div><div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-800 bg-neutral-800 md:grid-cols-4">{categories.map(([name, slug, Icon]) => <Link key={name} href={`/discover?category=${slug}`} className="bg-neutral-950 p-6 transition hover:bg-neutral-900"><Icon size={24}/><p className="mt-8 font-semibold">{name}</p><p className="mt-1 text-sm text-neutral-400">Explore projects</p></Link>)}</div></div></section>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="grid items-center gap-10 rounded-lg border border-neutral-200 px-6 py-10 lg:grid-cols-2 lg:px-12"><div><p className="text-sm font-semibold text-blue-700">How it works</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Make your ability visible.</h2></div><ol className="grid gap-5 sm:grid-cols-2"><li><span className="text-xs font-bold text-blue-700">01</span><p className="mt-2 font-semibold">Create your profile</p></li><li><span className="text-xs font-bold text-blue-700">02</span><p className="mt-2 font-semibold">Showcase your work</p></li><li><span className="text-xs font-bold text-blue-700">03</span><p className="mt-2 font-semibold">Get discovered</p></li><li><span className="text-xs font-bold text-blue-700">04</span><p className="mt-2 font-semibold">Connect with opportunities</p></li></ol></div></section>
      </main>
    </>
  );
}
