import Link from "next/link";
import { cookies } from "next/headers";
import { Navbar } from "../../components/navbar";
import { apiGet } from "../../lib/api";

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
  } | null;
  _count: { projects: number };
}

export default async function DashboardPage() {
  const cookieHeader = (await cookies()).toString();
  let user: SessionUser | null = null;
  let error = "";
  try {
    const result = await apiGet<{ user: SessionUser }>("/api/v1/auth/me", {
      headers: { cookie: cookieHeader },
    });
    user = result.user;
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Your account could not be loaded.";
  }
  const profile = user?.profile;
  const completionFields = [profile?.fullName, profile?.professionalTitle, profile?.bio, profile?.avatarUrl, profile?.location];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        {!user ? (
          <section className="mx-auto max-w-xl rounded-lg border p-8 text-center">
            <h1 className="text-2xl font-semibold">Sign in to open your dashboard</h1>
            <p className="mt-3 text-sm text-neutral-600">{error || "Your workspace and portfolio are available after you sign in."}</p>
            <Link href="/login" className="mt-6 inline-flex rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Sign in</Link>
          </section>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
            <aside className="h-fit rounded-lg border p-3">
              <nav className="flex flex-col text-sm">
                <Link className="rounded-md bg-neutral-100 px-3 py-2.5 font-semibold" href="/dashboard">Overview</Link>
                <Link className="px-3 py-2.5 text-neutral-600" href={`/profile/${user.username}`}>My public profile</Link>
                <Link className="px-3 py-2.5 text-neutral-600" href="/dashboard/profile/edit">Edit profile</Link>
                <Link className="px-3 py-2.5 text-neutral-600" href="/discover">Discover projects</Link>
              </nav>
            </aside>
            <section>
              <p className="text-sm font-semibold text-blue-700">Workspace</p>
              <h1 className="mt-2 text-3xl font-semibold">Welcome, {profile?.fullName ?? user.username}</h1>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-5"><p className="text-sm text-neutral-500">Projects</p><p className="mt-2 text-3xl font-semibold">{user._count.projects}</p></div>
                <div className="rounded-lg border p-5"><p className="text-sm text-neutral-500">Profile completion</p><p className="mt-2 text-3xl font-semibold">{completion}%</p></div>
              </div>
              <div className="mt-8 rounded-lg border p-6">
                <h2 className="font-semibold">Build your portfolio</h2>
                <p className="mt-2 text-sm text-neutral-600">Add a project and complete your profile so people can discover your work.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/dashboard/projects/new" className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Add a project</Link>
                  <Link href="/dashboard/profile/edit" className="rounded-md border px-4 py-2.5 text-sm font-semibold">Edit profile</Link>
                  <Link href={`/profile/${user.username}`} className="rounded-md border px-4 py-2.5 text-sm font-semibold">Preview profile</Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
