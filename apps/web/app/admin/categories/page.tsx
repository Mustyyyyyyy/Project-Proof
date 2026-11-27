import { cookies } from "next/headers";
import { AdminCategoryManager } from "../../../components/admin-content-managers";
import { apiGet } from "../../../lib/api";

interface Category {
  id: string;
  name: string;
  slug: string;
  _count: { projects: number };
}

export default async function AdminCategoriesPage() {
  let categories: Category[] = [];
  let error = "";
  try {
    categories = await apiGet<Category[]>("/api/v1/admin/categories", { headers: { cookie: (await cookies()).toString() } });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Categories could not be loaded.";
  }
  return (
    <div>
      <header className="mb-6"><p className="text-sm font-semibold text-blue-700">Administration</p><h1 className="mt-1 text-3xl font-semibold">Categories</h1><p className="mt-2 text-sm text-neutral-600">Manage how projects are grouped and discovered.</p></header>
      {error ? <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p> : <AdminCategoryManager initial={categories} />}
    </div>
  );
}
