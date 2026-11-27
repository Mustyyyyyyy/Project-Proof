import Image from "next/image";
import Link from "next/link";
import { Navbar } from "../../components/navbar";
import { apiGet } from "../../lib/api";

interface Professional {
  id: string;
  username: string;
  fullName: string;
  professionalTitle: string | null;
  avatarUrl: string | null;
  location: string | null;
  country: string | null;
  projectCount: number;
}

export default async function ProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const params = new URLSearchParams({ limit: "24" });
  if (query) params.set("q", query);
  let professionals: Professional[] = [];
  let error = "";
  try {
    professionals = await apiGet<Professional[]>(`/api/v1/profiles?${params.toString()}`, undefined, { revalidateSeconds: 30 });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Professionals could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight">Professionals</h1>
        <p className="mt-3 text-neutral-600">Discover experienced people through the work they have shipped.</p>
        <form action="/professionals" className="mt-6 flex gap-2">
          <label className="sr-only" htmlFor="professional-search">Search professionals</label>
          <input id="professional-search" name="q" defaultValue={query} className="h-11 flex-1 rounded-md border px-3" placeholder="Search by name, profession, or location" />
          <button className="rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white">Search</button>
        </form>
        {error ? (
          <p role="alert" className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
        ) : professionals.length === 0 ? (
          <p className="mt-8 rounded-lg border border-dashed p-8 text-sm text-neutral-500">No matching professionals found.</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {professionals.map((person) => (
              <article key={person.id} className="rounded-lg border p-5">
                {person.avatarUrl ? (
                  <Image src={person.avatarUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-full bg-neutral-900 text-sm font-bold text-white">{person.fullName.slice(0, 2).toUpperCase()}</span>
                )}
                <h2 className="mt-4 text-xl font-semibold">{person.fullName}</h2>
                <p className="text-sm text-neutral-600">{person.professionalTitle ?? "Professional"}</p>
                <p className="mt-1 text-sm text-neutral-500">{[person.location, person.country].filter(Boolean).join(", ")}</p>
                <p className="mt-4 text-sm text-neutral-600">{person.projectCount} public projects</p>
                <Link href={`/profile/${person.username}`} className="mt-5 flex h-10 items-center justify-center rounded-md border text-sm font-semibold">View profile</Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
