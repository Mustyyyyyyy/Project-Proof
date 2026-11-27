import Link from "next/link";
import { cookies } from "next/headers";
import { AdminReportControls } from "../../../components/admin-moderation-controls";
import { apiGet } from "../../../lib/api";

interface AdminReport {
  id: string;
  reason: string;
  details: string | null;
  adminNote: string | null;
  status: string;
  createdAt: string;
  reporter: { id: string; username: string; email: string };
  project: { id: string; title: string; slug: string; visibility: string; deletedAt: string | null; creator: { username: string } };
}
interface ReportsResponse {
  data: AdminReport[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
}

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const { status = "OPEN", page = "1" } = await searchParams;
  const params = new URLSearchParams({ page, pageSize: "50" });
  if (["OPEN", "RESOLVED", "DISMISSED"].includes(status)) params.set("status", status);
  let result: ReportsResponse | null = null;
  let error = "";
  try {
    result = await apiGet<ReportsResponse>(`/api/v1/admin/reports?${params}`, { headers: { cookie: (await cookies()).toString() } });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Reports could not be loaded.";
  }
  return (
    <div>
      <header><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold">Report queue</h1><p className="mt-2 text-sm text-neutral-600">Review concerns, record a decision, and remove harmful or infringing work when warranted.</p></header>
      <nav aria-label="Report status" className="mt-6 flex gap-2">{[["OPEN", "Open"], ["RESOLVED", "Resolved"], ["DISMISSED", "Dismissed"]].map(([value, label]) => <Link key={value} href={`/admin/reports?status=${value}`} aria-current={status === value ? "page" : undefined} className={`rounded-md px-4 py-2 text-sm font-semibold ${status === value ? "bg-blue-700 text-white" : "border bg-white text-neutral-700"}`}>{label}</Link>)}</nav>
      {error ? <p role="alert" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p> : result && <section className="mt-5 space-y-4">
        <p className="text-sm text-neutral-500">{result.pagination.total} {status.toLowerCase()} reports</p>
        {result.data.length ? result.data.map((report) => <article key={report.id} className="rounded-lg border border-neutral-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row">
            <div><p className="text-xs font-bold uppercase tracking-wide text-amber-800">{report.reason.replaceAll("_", " ")}</p><h2 className="mt-2 text-lg font-semibold"><Link href={`/projects/${report.project.slug}`} className="hover:text-blue-800">{report.project.title}</Link></h2><p className="mt-1 text-sm text-neutral-600">By @{report.project.creator.username} · reported by @{report.reporter.username} on {new Date(report.createdAt).toLocaleString()}</p></div>
            <span className="h-fit rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium">{report.status}</span>
          </div>
          {report.details && <p className="mt-4 whitespace-pre-wrap rounded-md bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">{report.details}</p>}
          {report.adminNote && <p className="mt-3 text-xs text-neutral-500">Previous note: {report.adminNote}</p>}
          <AdminReportControls reportId={report.id} />
        </article>) : <div className="rounded-lg border border-dashed bg-white p-10 text-center text-sm text-neutral-500">No reports in this queue.</div>}
        {result.pagination.pages > 1 && <nav aria-label="Report pages" className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-5 py-4 text-sm">
          {result.pagination.page > 1 ? <Link href={`/admin/reports?${new URLSearchParams({ status, page: String(result.pagination.page - 1) })}`} className="font-semibold text-blue-700">Previous</Link> : <span />}
          <span className="text-neutral-500">Page {result.pagination.page} of {result.pagination.pages}</span>
          {result.pagination.page < result.pagination.pages ? <Link href={`/admin/reports?${new URLSearchParams({ status, page: String(result.pagination.page + 1) })}`} className="font-semibold text-blue-700">Next</Link> : <span />}
        </nav>}
      </section>}
    </div>
  );
}
