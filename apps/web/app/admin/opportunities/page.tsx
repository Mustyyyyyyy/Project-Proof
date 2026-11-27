import { cookies } from "next/headers";
import { AdminOpportunityManager } from "../../../components/admin-content-managers";
import { apiGet } from "../../../lib/api";

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
}

export default async function AdminOpportunitiesPage() {
  let opportunities: Opportunity[] = [];
  let error = "";
  try {
    opportunities = await apiGet<Opportunity[]>("/api/v1/admin/opportunities", { headers: { cookie: (await cookies()).toString() } });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Opportunities could not be loaded.";
  }
  return (
    <div>
      <header className="mb-6"><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold">Opportunities</h1><p className="mt-2 text-sm text-neutral-600">Publish, update, and remove roles and collaborations from the public board.</p></header>
      {error ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p> : <AdminOpportunityManager initial={opportunities} />}
    </div>
  );
}
