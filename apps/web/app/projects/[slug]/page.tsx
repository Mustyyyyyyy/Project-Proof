import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, MapPin, MessageCircle } from "lucide-react";
import { Navbar } from "../../../components/navbar";
import { ProjectActions } from "../../../components/project-actions";
import { ProjectReportButton } from "../../../components/project-report-button";
import { apiGet } from "../../../lib/api";

interface ProjectDetails {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  detailedDescription: string | null;
  status: string;
  projectType: string;
  location: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
  category: { name: string } | null;
  skills: { skill: { id: string; name: string } }[];
  creator: {
    username: string;
    profile: {
      fullName: string;
      professionalTitle: string | null;
      bio: string | null;
      avatarUrl: string | null;
      location: string | null;
      country: string | null;
      isVerified: boolean;
    } | null;
  };
  _count: { likes: number };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let project: ProjectDetails | null = null;
  let error = "";
  try {
    project = await apiGet<ProjectDetails>(`/api/v1/projects/${encodeURIComponent(slug)}`, undefined, { revalidateSeconds: 30 });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Project could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <nav className="mb-6 text-sm text-neutral-500"><Link href="/discover">Discover</Link> / {project?.title ?? "Project"}</nav>
        {error ? (
          <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
        ) : project ? (
          <>
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <h1 className="text-4xl font-semibold tracking-tight">{project.title}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-500">
                  <span>{project.category?.name ?? "Project"}</span><span>·</span>
                  <span>{project.status.replaceAll("_", " ").toLowerCase()}</span><span>·</span>
                  <span>{project.projectType}</span>
                </div>
                {project.coverUrl ? (
                  <div className="relative mt-8 aspect-[16/10] overflow-hidden rounded-lg bg-neutral-100">
                    <Image src={project.coverUrl} alt="" fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 65vw" />
                  </div>
                ) : <div className="mt-8 aspect-[16/10] rounded-lg bg-neutral-100" />}
                <section className="mt-10 max-w-3xl">
                  <h2 className="text-2xl font-semibold">Project overview</h2>
                  <p className="mt-4 whitespace-pre-line leading-7 text-neutral-600">{project.detailedDescription || project.shortDescription}</p>
                  {project.skills.length > 0 && (
                    <div className="mt-8">
                      <h2 className="font-semibold">Skills and tools</h2>
                      <div className="mt-3 flex flex-wrap gap-2">{project.skills.map(({ skill }) => <span key={skill.id} className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm">{skill.name}</span>)}</div>
                    </div>
                  )}
                  {project.publishedAt && <p className="mt-8 text-sm text-neutral-500">Published {new Date(project.publishedAt).toLocaleDateString()}</p>}
                </section>
              </div>
              <aside className="h-fit rounded-lg border border-neutral-200 p-6 lg:sticky lg:top-24">
                <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Created by</p>
                <div className="mt-4 flex items-center gap-3">
                  {project.creator.profile?.avatarUrl ? (
                    <Image src={project.creator.profile.avatarUrl} alt="" width={48} height={48} className="size-12 rounded-full object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-full bg-neutral-900 text-sm font-bold text-white">{(project.creator.profile?.fullName ?? project.creator.username).slice(0, 2).toUpperCase()}</span>
                  )}
                  <div>
                    <Link href={`/profile/${project.creator.username}`} className="flex items-center gap-1 font-semibold">
                      {project.creator.profile?.fullName ?? project.creator.username}
                      {project.creator.profile?.isVerified && <BadgeCheck size={16} className="text-blue-700" aria-label="Verified" />}
                    </Link>
                    <p className="text-sm text-neutral-500">@{project.creator.username}</p>
                  </div>
                </div>
                {project.creator.profile?.professionalTitle && <p className="mt-3 text-sm text-neutral-600">{project.creator.profile.professionalTitle}</p>}
                {project.creator.profile?.bio && <p className="mt-3 text-sm text-neutral-600">{project.creator.profile.bio}</p>}
                {(project.creator.profile?.location || project.creator.profile?.country || project.location) && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-neutral-500"><MapPin size={15} />{[project.location, project.creator.profile?.location, project.creator.profile?.country].filter(Boolean).join(", ")}</p>
                )}
                <Link href={`/profile/${project.creator.username}`} className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-md bg-blue-700 text-sm font-semibold text-white">
                  <MessageCircle size={17} /> View contact options
                </Link>
                <ProjectActions projectId={project.id} initialLikes={project._count.likes} />
                <ProjectReportButton projectId={project.id} />
              </aside>
            </div>
          </>
        ) : null}
      </main>
    </>
  );
}
