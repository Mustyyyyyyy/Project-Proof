import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, BriefcaseBusiness, Flag, FolderKanban, Tags, Users } from "lucide-react";
import { apiGet } from "../../lib/api";

interface Overview {
  totals: {
    users: number;
    activeUsers: number;
    projects: number;
    publicProjects: number;
    deletedProjects: number;
    openReports: number;
    opportunities: number;
    categories: number;
  };
  newestUsers: { id: string; username: string; email: string; role: string; createdAt: string; deletedAt: string | null; profile: { fullName: string } | null }[];
  latestReports: { id: string; reason: string; createdAt: string; reporter: { username: string }; project: { id: string; title: string; slug: string } }[];
}

const cards = [
  { key: "users", title: "Accounts", icon: Users, href: "/admin/users", detail: (data: Overview["totals"]) => `${data.activeUsers} active of ${data.users} total` },
  { key: "projects", title: "Projects", icon: FolderKanban, href: "/admin/projects", detail: (data: Overview["totals"]) => `${data.publicProjects} public · ${data.deletedProjects} removed` },
  { key: "openReports", title: "Open reports", icon: Flag, href: "/admin/reports", detail: () => "Review content reports" },
  { key: "opportunities", title: "Opportunities", icon: BriefcaseBusiness, href: "/admin/opportunities", detail: () => "Manage the opportunity board" },
  { key: "categories", title: "Categories", icon: Tags, href: "/admin/categories", detail: () => "Organize project discovery" },
] as const;

export default async function AdminOverviewPage() {
  let data: Overview | null = null;
  let error = "";
  try {
    const cookieHeader = (await cookies()).toString();
    data = await apiGet<Overview>("/api/v1/admin/overview", { headers: { cookie: cookieHeader } });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Administration data could not be loaded.";
  }
  if (!data) return <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>;

  return (
    <div className="space-y-8">
      <header><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold">Platform overview</h1><p className="mt-2 text-sm text-neutral-600">Monitor users, portfolio content, reports, and discovery data.</p></header>
      <section aria-label="Platform metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(({ key, title, icon: Icon, href, detail }) => (
          <Link key={key} href={href} className="rounded-lg border border-neutral-200 bg-white p-5 transition hover:border-neutral-400">
            <div className="flex items-center justify-between"><span className="text-sm font-medium text-neutral-600">{title}</span><Icon size={18} className="text-blue-700" /></div>
            <p className="mt-4 text-3xl font-semibold">{data.totals[key]}</p>
            <p className="mt-1 text-xs text-neutral-500">{detail(data.totals)}</p>
          </Link>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">New accounts</h2><Link href="/admin/users" className="text-sm font-semibold text-blue-700">Manage users <ArrowRight size={14} className="ml-1 inline" /></Link></div>
          {data.newestUsers.length ? <div className="divide-y">{data.newestUsers.map((user) => <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{user.profile?.fullName ?? user.username}</p><p className="truncate text-xs text-neutral-500">{user.email} · @{user.username}</p></div><span className="shrink-0 rounded-full bg-neutral-100 px-2.5 py-1 text-xs">{user.deletedAt ? "Suspended" : user.role}</span></div>)}</div> : <p className="p-5 text-sm text-neutral-500">No accounts yet.</p>}
        </section>
        <section className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b px-5 py-4"><h2 className="font-semibold">Open reports</h2><Link href="/admin/reports" className="text-sm font-semibold text-blue-700">Review queue <ArrowRight size={14} className="ml-1 inline" /></Link></div>
          {data.latestReports.length ? <div className="divide-y">{data.latestReports.map((report) => <div key={report.id} className="px-5 py-3"><Link href="/admin/reports" className="text-sm font-semibold hover:text-blue-800">{report.project.title}</Link><p className="mt-1 text-xs text-neutral-500">{report.reason.replaceAll("_", " ")} · reported by @{report.reporter.username} · {new Date(report.createdAt).toLocaleDateString()}</p></div>)}</div> : <p className="p-5 text-sm text-neutral-500">The report queue is clear.</p>}
        </section>
      </div>
    </div>
  );
}
