import Link from "next/link";
import { Navbar } from "../../components/navbar";
import { apiGet } from "../../lib/api";

interface Opportunity {
  id: string;
  title: string;
  company: string;
  description: string;
  type: string;
  location: string | null;
  remote: boolean;
  compensation: string | null;
  deadline: string | null;
  publishedAt: string;
}

const typeLabels: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  FREELANCE: "Freelance",
  INTERNSHIP: "Internship",
  CONTRACT: "Contract",
  COLLABORATION: "Collaboration",
  VOLUNTEER: "Volunteer",
  SCHOLARSHIP: "Scholarship",
  PROJECT_BASED: "Project-based",
};

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { q = "", type = "" } = await searchParams;
  const query = q.trim();
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  let results: Opportunity[] | null = null;
  let error = "";
  try {
    results = await apiGet<Opportunity[]>(`/api/v1/opportunities${params.size ? `?${params}` : ""}`, undefined, { revalidateSeconds: 30 });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Opportunities could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
        <h1 className="text-4xl font-semibold tracking-tight">Opportunities</h1>
        <p className="mt-3 text-neutral-600">Find work where your demonstrated skills matter.</p>
        <form action="/opportunities" className="mt-6 grid gap-3 sm:grid-cols-[1fr_220px_auto]">
          <label className="sr-only" htmlFor="opportunity-search">Search opportunities</label>
          <input id="opportunity-search" name="q" defaultValue={query} className="h-11 rounded-md border px-3" placeholder="Search title, company, or location" />
          <label className="sr-only" htmlFor="opportunity-type">Type</label>
          <select id="opportunity-type" name="type" defaultValue={type} className="h-11 rounded-md border bg-white px-3 text-sm">
            <option value="">All opportunity types</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button className="rounded-md bg-neutral-950 px-5 text-sm font-semibold text-white">Search</button>
        </form>
        {error ? (
          <p role="alert" className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
        ) : results?.length ? (
          <div className="mt-8 divide-y border-y">
            {results.map((opportunity) => (
              <article key={opportunity.id} className="grid gap-4 py-6 md:grid-cols-[1fr_220px]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{typeLabels[opportunity.type] ?? opportunity.type}</p>
                  <h2 className="mt-2 text-xl font-semibold">{opportunity.title}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{opportunity.company} · {opportunity.location ?? "Location not specified"}{opportunity.remote ? " · Remote" : ""}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">{opportunity.description}</p>
                  {opportunity.compensation && <p className="mt-3 text-sm font-medium">{opportunity.compensation}</p>}
                </div>
                <div className="text-sm text-neutral-500">
                  <p>Posted {new Date(opportunity.publishedAt).toLocaleDateString()}</p>
                  {opportunity.deadline && <p className="mt-2">Deadline {new Date(opportunity.deadline).toLocaleDateString()}</p>}
                  <Link href="/login" className="mt-4 inline-flex text-sm font-semibold text-blue-700">Sign in to continue</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-8 rounded-lg border border-dashed p-8 text-sm text-neutral-500">No matching opportunities are available right now.</p>
        )}
      </main>
    </>
  );
}
