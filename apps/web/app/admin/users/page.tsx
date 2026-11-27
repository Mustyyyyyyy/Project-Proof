import Link from "next/link";
import { cookies } from "next/headers";
import { AdminUserControls } from "../../../components/admin-moderation-controls";
import { apiGet } from "../../../lib/api";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
  profile: { fullName: string; avatarUrl: string | null } | null;
  _count: { projects: number };
}
interface UserResponse {
  data: AdminUser[];
  pagination: { page: number; pageSize: number; total: number; pages: number };
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { q = "", page = "1" } = await searchParams;
  const params = new URLSearchParams({ page, pageSize: "30" });
  if (q) params.set("q", q);
  let result: UserResponse | null = null;
  let error = "";
  try {
    result = await apiGet<UserResponse>(`/api/v1/admin/users?${params}`, { headers: { cookie: (await cookies()).toString() } });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Users could not be loaded.";
  }
  return (
    <div>
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold">Users</h1><p className="mt-2 text-sm text-neutral-600">Review accounts, assign administrator access, and suspend or reactivate users.</p></div>
        <form action="/admin/users" className="flex gap-2"><input name="q" defaultValue={q} className="h-10 min-w-0 rounded-md border px-3 text-sm" placeholder="Search name, email, username" /><button className="rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white">Search</button></form>
      </header>
      {error ? <p role="alert" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p> : result && (
        <section className="mt-7 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <div className="flex justify-between border-b px-5 py-4"><h2 className="font-semibold">Accounts</h2><span className="text-sm text-neutral-500">{result.pagination.total} total</span></div>
          {result.data.length ? <div className="divide-y">{result.data.map((user) => {
            const suspended = Boolean(user.deletedAt);
            return <article key={user.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0"><p className="truncate font-semibold">{user.profile?.fullName ?? user.username} <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">{user.role}</span>{suspended && <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-800">Suspended</span>}</p><p className="mt-1 truncate text-sm text-neutral-600">{user.email} · @{user.username}</p><p className="mt-1 text-xs text-neutral-500">{user._count.projects} projects · Joined {new Date(user.createdAt).toLocaleDateString()}</p></div>
              <AdminUserControls userId={user.id} role={user.role} suspended={suspended} />
            </article>;
          })}</div> : <p className="p-8 text-center text-sm text-neutral-500">No users match that search.</p>}
          {result.pagination.pages > 1 && <div className="flex justify-between border-t px-5 py-4 text-sm">{result.pagination.page > 1 ? <Link href={`/admin/users?${new URLSearchParams({ q, page: String(result.pagination.page - 1) })}`} className="font-semibold text-blue-700">Previous</Link> : <span />}<span className="text-neutral-500">Page {result.pagination.page} of {result.pagination.pages}</span>{result.pagination.page < result.pagination.pages ? <Link href={`/admin/users?${new URLSearchParams({ q, page: String(result.pagination.page + 1) })}`} className="font-semibold text-blue-700">Next</Link> : <span />}</div>}
        </section>
      )}
    </div>
  );
}
