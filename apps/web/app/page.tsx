import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, Code2, Palette, Camera, Building2, BriefcaseBusiness, PenTool, Video, Music2 } from "lucide-react";
import { Navbar } from "../components/navbar";
import { ProjectActions } from "../components/project-actions";
import { SiteFooter } from "../components/site-footer";
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
interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { projects: number };
}
interface Opportunity {
  id: string;
  title: string;
  company: string;
  type: string;
  location: string | null;
  remote: boolean;
}
const disciplines = [
  { icon: Code2, matches: ["software", "development", "technology", "web"] },
  { icon: Palette, matches: ["design", "product", "graphic"] },
  { icon: Camera, matches: ["photo", "image"] },
  { icon: Building2, matches: ["architecture", "interior", "built"] },
  { icon: PenTool, matches: ["writing", "illustration", "art", "content"] },
  { icon: Video, matches: ["video", "film", "motion"] },
  { icon: Music2, matches: ["music", "audio", "sound"] },
  { icon: BriefcaseBusiness, matches: [] },
];
const projectImageFallbacks = [
  "photo-1498050108023-c5249f4df085",
  "photo-1558655146-d09347e92766",
  "photo-1500530855697-b586d89ba3ee",
];
const imageUrl = (photo: string, width: number) =>
  `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=${width}&q=80`;

export default async function Home() {
  let projects: ProjectSummary[] = [];
  let professionals: FeaturedProfessional[] = [];
  let categories: Category[] = [];
  let opportunities: Opportunity[] = [];
  let projectError = "";
  let professionalError = "";
  let categoryError = "";
  let opportunityError = "";
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
  try {
    categories = await apiGet<Category[]>("/api/v1/categories");
  } catch (reason) {
    categoryError = reason instanceof Error ? reason.message : "Categories could not be loaded.";
  }
  try {
    opportunities = await apiGet<Opportunity[]>("/api/v1/opportunities?pageSize=3");
  } catch (reason) {
    opportunityError = reason instanceof Error ? reason.message : "Opportunities could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main>
        <section className="border-b border-neutral-200 bg-neutral-50">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-16">
            <div className="min-w-0 max-w-2xl">
              <p className="mb-5 text-sm font-bold uppercase tracking-[0.18em] text-blue-700">Proof over promises</p>
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-neutral-950 sm:text-6xl">Your work deserves more than a CV.</h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">Showcase real projects, discover talented people, and connect with opportunities that value what you can actually do.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"><Link href="/register" className="rounded-md bg-blue-700 px-5 py-3.5 text-center text-sm font-semibold text-white">Create your portfolio <ArrowRight className="ml-2 inline" size={17}/></Link><Link href="/discover" className="rounded-md border border-neutral-300 bg-white px-5 py-3.5 text-center text-sm font-semibold">Explore projects</Link></div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-xl bg-neutral-800 sm:min-h-[380px]">
              <Image src={imageUrl("photo-1521737711867-e3b97375f902", 1400)} alt="A creative team reviewing project work together" fill priority sizes="(max-width:1024px) 100vw, 45vw" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-950/10 to-neutral-950/5" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Work worth showing</p>
                <p className="mt-2 max-w-md text-2xl font-semibold leading-tight sm:text-3xl">Bring your process, projects, and next step together.</p>
              </div>
            </div>
            <form action="/search" className="min-w-0 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm lg:col-span-2">
              <label className="sr-only" htmlFor="hero-search">Search</label><div className="flex min-w-0 items-center"><Search className="ml-3 shrink-0 text-neutral-400" size={20}/><input id="hero-search" name="q" className="h-14 min-w-0 flex-1 px-3 outline-none" placeholder="Search projects, people, skills, or categories..."/><button className="shrink-0 rounded-md bg-neutral-950 px-5 py-3 text-sm font-semibold text-white">Search</button></div>
            </form>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 sm:grid-cols-3 lg:px-8">
          <div className="rounded-lg border border-neutral-200 bg-white p-5"><p className="font-semibold">Show the work</p><p className="mt-2 text-sm leading-6 text-neutral-600">Turn finished projects and works-in-progress into a clear, shareable portfolio.</p></div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5"><p className="font-semibold">Find your people</p><p className="mt-2 text-sm leading-6 text-neutral-600">Explore real work across disciplines and learn from the people behind it.</p></div>
          <div className="rounded-lg border border-neutral-200 bg-white p-5"><p className="font-semibold">Make the next connection</p><p className="mt-2 text-sm leading-6 text-neutral-600">Discover roles and collaborations that fit the skills you can demonstrate.</p></div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-semibold text-blue-700">Discover</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Featured projects</h2></div><Link href="/discover" className="hidden text-sm font-semibold sm:block">View all <ArrowRight className="ml-1 inline" size={15}/></Link></div>
          {projectError ? (
            <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{projectError}</p>
          ) : projects.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-sm text-neutral-500">No public projects have been published yet.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => {
                const creator = project.creator.profile;
                return (
                  <article key={project.id} className="group overflow-hidden rounded-lg border border-neutral-200 bg-white">
                    <Link href={`/projects/${project.slug}`} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                        <Image src={project.coverUrl || imageUrl(projectImageFallbacks[index % projectImageFallbacks.length] ?? "photo-1498050108023-c5249f4df085", 900)} alt={project.coverUrl ? `${project.title} project cover` : ""} fill className="object-cover transition duration-500 group-hover:scale-[1.02]" sizes="(max-width:768px) 100vw, 33vw" />
                      </div>
                    </Link>
                    <div className="p-5">
                      <Link href={`/projects/${project.slug}`}>
                        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{project.category?.name ?? "Project"}</p>
                        <h3 className="mt-2 text-xl font-semibold">{project.title}</h3>
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                      <div className="mt-5 flex items-center gap-3 border-t border-neutral-100 pt-4">
                        <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-neutral-900 text-xs font-bold text-white">
                          {creator?.avatarUrl ? <Image src={creator.avatarUrl} alt="" fill sizes="36px" className="object-cover" /> : (creator?.fullName ?? project.creator.username).slice(0, 2).toUpperCase()}
                        </span>
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
                  <span className="relative grid size-12 place-items-center overflow-hidden rounded-full bg-neutral-900 text-sm font-bold text-white">
                    {person.avatarUrl ? <Image src={person.avatarUrl} alt="" fill sizes="48px" className="object-cover" /> : person.fullName.slice(0, 2).toUpperCase()}
                  </span>
                  <h3 className="mt-4 font-semibold">{person.fullName}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{person.professionalTitle ?? "Professional"}</p>
                  <p className="mt-2 text-xs text-neutral-500">{[person.location, person.country].filter(Boolean).join(", ")} · {person.projectCount} projects</p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="border-y border-neutral-200 bg-neutral-950 py-16 text-white">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-semibold text-blue-400">Explore</p><h2 className="mt-2 text-3xl font-semibold">Browse by discipline</h2></div><Link href="/discover" className="text-sm font-semibold text-white">All projects <ArrowRight className="ml-1 inline" size={15}/></Link></div>
            {categoryError ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{categoryError}</p> : categories.length ? (
              <div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-800 bg-neutral-800 md:grid-cols-4">
                {categories.map((category, index) => {
                  const Icon = disciplines.find(({ matches }) => matches.some((word) => category.name.toLowerCase().includes(word)))?.icon ?? disciplines[index % disciplines.length]?.icon ?? BriefcaseBusiness;
                  return <Link key={category.id} href={`/discover?category=${encodeURIComponent(category.slug)}`} className="bg-neutral-950 p-6 transition hover:bg-neutral-900"><Icon size={24}/><p className="mt-8 font-semibold">{category.name}</p><p className="mt-1 text-sm text-neutral-400">{category._count.projects} {category._count.projects === 1 ? "project" : "projects"}</p></Link>;
                })}
              </div>
            ) : <p className="rounded-lg border border-neutral-700 p-6 text-sm text-neutral-300">Project categories will appear here as work is published.</p>}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 flex items-end justify-between"><div><p className="text-sm font-semibold text-blue-700">Take the next step</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Opportunities built around real work</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">Explore roles, freelance projects, and collaborations from the opportunity board.</p></div><Link href="/opportunities" className="hidden text-sm font-semibold sm:block">Browse opportunities <ArrowRight className="ml-1 inline" size={15}/></Link></div>
          {opportunityError ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{opportunityError}</p> : opportunities.length ? (
            <div className="grid gap-4 md:grid-cols-3">{opportunities.map((opportunity) => <article key={opportunity.id} className="rounded-lg border border-neutral-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-wider text-blue-700">{opportunity.type.replaceAll("_", " ").toLowerCase()}</p><h3 className="mt-3 text-lg font-semibold">{opportunity.title}</h3><p className="mt-1 text-sm text-neutral-600">{opportunity.company}</p><p className="mt-4 text-sm text-neutral-500">{[opportunity.location, opportunity.remote ? "Remote" : null].filter(Boolean).join(" · ") || "Location not specified"}</p></article>)}</div>
          ) : <div className="rounded-lg border border-dashed p-6 text-sm text-neutral-600">There are no opportunities available right now. <Link href="/opportunities" className="font-semibold text-blue-700">Check the board</Link></div>}
          <Link href="/opportunities" className="mt-5 inline-flex text-sm font-semibold text-blue-700 sm:hidden">Browse opportunities <ArrowRight className="ml-1 inline" size={15}/></Link>
        </section>
        <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
          <div className="grid items-start gap-10 rounded-lg border border-neutral-200 bg-white px-6 py-10 lg:grid-cols-2 lg:px-12">
            <div><p className="text-sm font-semibold text-blue-700">How it works</p><h2 className="mt-2 text-3xl font-semibold tracking-tight">Make your ability visible.</h2><p className="mt-4 max-w-md text-sm leading-6 text-neutral-600">A good portfolio gives people the context behind your work—not only the finished image or link.</p><Link href="/register" className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-3 text-sm font-semibold text-white">Start your portfolio <ArrowRight size={16}/></Link></div>
            <ol className="grid gap-6 sm:grid-cols-2">
              <li><span className="text-xs font-bold text-blue-700">01</span><p className="mt-2 font-semibold">Create your profile</p><p className="mt-1 text-sm leading-6 text-neutral-600">Introduce yourself, your focus, and the skills you bring.</p></li>
              <li><span className="text-xs font-bold text-blue-700">02</span><p className="mt-2 font-semibold">Showcase your work</p><p className="mt-1 text-sm leading-6 text-neutral-600">Share the challenge, your approach, and what you contributed.</p></li>
              <li><span className="text-xs font-bold text-blue-700">03</span><p className="mt-2 font-semibold">Get discovered</p><p className="mt-1 text-sm leading-6 text-neutral-600">Let people browse projects and find the makers behind them.</p></li>
              <li><span className="text-xs font-bold text-blue-700">04</span><p className="mt-2 font-semibold">Connect with opportunities</p><p className="mt-1 text-sm leading-6 text-neutral-600">Use your work as a starting point for the next conversation.</p></li>
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
