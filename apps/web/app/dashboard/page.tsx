import Link from "next/link";
import Image from "next/image";
import { cookies } from "next/headers";
import { ArrowRight, Bookmark, Eye, FolderKanban, Heart, Plus, UserRound } from "lucide-react";
import { apiGet, type ProjectSummary } from "../../lib/api";

interface SessionUser {
  id: string;
  email: string;
  username: string;
  profile: {
    fullName: string;
    professionalTitle: string | null;
    bio: string | null;
    avatarUrl: string | null;
    location: string | null;
    country: string | null;
    website: string | null;
  } | null;
}

interface DashboardOverview {
  totals: {
    totalProjects: number;
    publicProjects: number;
    drafts: number;
    savedProjects: number;
    likesReceived: number;
  };
  recentProjects: (ProjectSummary & {
    status: string;
    visibility: string;
    updatedAt: string;
  })[];
}

export default async function DashboardPage() {
  const cookieHeader = (await cookies()).toString();
  const options = { headers: { cookie: cookieHeader } };
  let user: SessionUser | null = null;
  let overview: DashboardOverview | null = null;
  let error = "";

  try {
    const [session, activity] = await Promise.all([
      apiGet<{ user: SessionUser }>("/api/v1/auth/me", options),
      apiGet<DashboardOverview>("/api/v1/dashboard/overview", options),
    ]);
    user = session.user;
    overview = activity;
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Your workspace could not be loaded.";
  }

  if (!user || !overview) {
    return (
      <section className="mx-auto max-w-xl rounded-lg border border-neutral-200 bg-white p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-blue-100 text-blue-900"><UserRound size={22} /></span>
        <h1 className="mt-4 text-2xl font-semibold">Sign in to open your dashboard</h1>
        <p className="mt-3 text-sm text-neutral-600">{error || "Your workspace and portfolio are available after you sign in."}</p>
        <Link href="/login" className="mt-6 inline-flex rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Sign in</Link>
      </section>
    );
  }

  const profile = user.profile;
  const fields = [
    { label: "Professional title", value: profile?.professionalTitle, href: "/dashboard/profile/edit" },
    { label: "A short introduction", value: profile?.bio, href: "/dashboard/profile/edit" },
    { label: "Location", value: profile?.location && profile?.country ? `${profile.location}, ${profile.country}` : profile?.location || profile?.country, href: "/dashboard/profile/edit" },
    { label: "Portfolio website", value: profile?.website, href: "/dashboard/profile/edit" },
    { label: "Profile photo", value: profile?.avatarUrl, href: "/dashboard/profile/edit" },
  ];
  const completed = fields.filter((field) => Boolean(field.value)).length;
  const completion = Math.round((completed / fields.length) * 100);
  const metrics = [
    { label: "All projects", value: overview.totals.totalProjects, detail: "Your portfolio", icon: FolderKanban, href: "/dashboard/projects" },
    { label: "Published", value: overview.totals.publicProjects, detail: "Visible to everyone", icon: Eye, href: "/dashboard/projects" },
    { label: "Likes received", value: overview.totals.likesReceived, detail: "Across your projects", icon: Heart, href: "/dashboard/projects" },
    { label: "Saved by you", value: overview.totals.savedProjects, detail: "Projects to revisit", icon: Bookmark, href: "/dashboard/saved" },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-5 rounded-xl border border-neutral-200 bg-white p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-sm font-semibold text-blue-700">Your workspace</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Welcome back, {profile?.fullName ?? user.username}</h1>
          <p className="mt-2 text-sm text-neutral-600">Keep your portfolio current and let your work open the next door.</p>
        </div>
        <Link href="/dashboard/projects/new" className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800">
          <Plus size={17} /> Add a project
        </Link>
      </section>

      {error && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{error}</p>}

      <section aria-label="Portfolio overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon, href }) => (
          <Link key={label} href={href} className="rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-neutral-400">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-600">{label}</span>
              <Icon size={18} className="text-blue-700" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-1 text-xs text-neutral-500">{detail}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 sm:px-6">
            <div><h2 className="font-semibold">Recent projects</h2><p className="mt-1 text-xs text-neutral-500">The latest work in your portfolio</p></div>
            <Link href="/dashboard/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Manage <ArrowRight size={15} /></Link>
          </div>
          {overview.recentProjects.length ? (
            <div className="divide-y divide-neutral-100">
              {overview.recentProjects.map((project) => (
                <div key={project.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <Link href={`/projects/${project.slug}`} className="relative size-14 shrink-0 overflow-hidden rounded-md bg-neutral-100">
                    {project.coverUrl && <Image src={project.coverUrl} alt="" fill sizes="56px" className="object-cover" />}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/projects/${project.slug}`} className="block truncate text-sm font-semibold hover:text-blue-800">{project.title}</Link>
                    <p className="mt-1 truncate text-xs text-neutral-500">{project.category?.name ?? "Uncategorized"} · {project._count.likes} likes</p>
                  </div>
                  <span className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${project.visibility === "PUBLIC" ? "bg-blue-100 text-blue-900" : "bg-neutral-100 text-neutral-600"}`}>
                    {project.visibility === "PUBLIC" ? "Published" : project.visibility === "PRIVATE" ? "Private" : "Unlisted"}
                  </span>
                  <Link href={`/dashboard/projects/${project.id}/edit`} className="shrink-0 rounded-md border px-3 py-2 text-xs font-semibold hover:bg-neutral-50">Edit</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-10 text-center">
              <FolderKanban className="mx-auto text-neutral-400" size={25} />
              <h3 className="mt-3 text-sm font-semibold">Your first project starts here</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-neutral-500">Add a project to show how you think, what you built, and the skills you brought to it.</p>
              <Link href="/dashboard/projects/new" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><Plus size={16} /> Create your first project</Link>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="font-semibold">Profile strength</h2><p className="mt-1 text-xs text-neutral-500">A complete profile helps people understand your work.</p></div>
            <span className="text-2xl font-semibold text-blue-800">{completion}%</span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
            <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${completion}%` }} />
          </div>
          <ul className="mt-5 space-y-3">
            {fields.map((field) => (
              <li key={field.label} className="flex items-center justify-between gap-3 text-sm">
                <span className={field.value ? "text-neutral-500 line-through" : "font-medium"}>{field.label}</span>
                {!field.value && <Link href={field.href} className="shrink-0 text-xs font-semibold text-blue-700">Add</Link>}
              </li>
            ))}
          </ul>
          <Link href="/dashboard/profile/edit" className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Complete your profile <ArrowRight size={15} /></Link>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/projects" className="group rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-neutral-400">
          <FolderKanban className="text-blue-700" size={20} /><h2 className="mt-4 font-semibold">Manage your work</h2><p className="mt-1 text-sm text-neutral-600">Edit descriptions, update visibility, and keep your projects organized.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">My projects <ArrowRight size={15} /></span>
        </Link>
        <Link href="/dashboard/saved" className="group rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-neutral-400">
          <Bookmark className="text-blue-700" size={20} /><h2 className="mt-4 font-semibold">Pick up where you left off</h2><p className="mt-1 text-sm text-neutral-600">Revisit projects you saved for reference or inspiration.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Saved projects <ArrowRight size={15} /></span>
        </Link>
        <Link href={`/profile/${user.username}`} className="group rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-neutral-400">
          <UserRound className="text-blue-700" size={20} /><h2 className="mt-4 font-semibold">See your public presence</h2><p className="mt-1 text-sm text-neutral-600">Review the portfolio visitors see when they discover your profile.</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Preview profile <ArrowRight size={15} /></span>
        </Link>
      </section>
    </div>
  );
}
