import Link from "next/link";
import { cookies } from "next/headers";
import { AdminShell } from "../../components/admin-shell";
import { apiGet } from "../../lib/api";

interface AdminSession {
  user: { role: string };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const cookieHeader = (await cookies()).toString();
    const session = await apiGet<AdminSession>("/api/v1/auth/me", { headers: { cookie: cookieHeader } });
    if (session.user.role !== "ADMIN") throw new Error("Administrator access is required.");
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : "Sign in with an administrator account to continue.";
    return (
      <main className="grid min-h-screen place-items-center bg-neutral-50 px-5">
        <section className="w-full max-w-lg rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700">ProjectProof Admin</p>
          <h1 className="mt-3 text-2xl font-semibold">Administrator access required</h1>
          <p className="mt-3 text-sm text-neutral-600">{message}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Sign in</Link>
            <Link href="/dashboard" className="rounded-md border px-4 py-2.5 text-sm font-semibold">User dashboard</Link>
          </div>
        </section>
      </main>
    );
  }
  return <AdminShell>{children}</AdminShell>;
}
