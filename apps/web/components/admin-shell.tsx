"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Flag, FolderKanban, LayoutDashboard, Tags, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const links: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Projects", href: "/admin/projects", icon: FolderKanban },
  { label: "Reports", href: "/admin/reports", icon: Flag },
  { label: "Opportunities", href: "/admin/opportunities", icon: BriefcaseBusiness },
  { label: "Categories", href: "/admin/categories", icon: Tags },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center justify-between gap-5">
            <Link href="/admin" className="flex items-center gap-2 font-bold tracking-tight">
              <span className="grid size-8 place-items-center rounded-md bg-neutral-950 text-xs text-white">PP</span>
              <span>ProjectProof <span className="font-medium text-neutral-500">Admin</span></span>
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-600 hover:text-neutral-950 lg:hidden"><ArrowLeft size={14} /> User dashboard</Link>
          </div>
          <nav aria-label="Administration" className="flex gap-1 overflow-x-auto pb-1 lg:pb-0">
            {links.map(({ label, href, icon: Icon }) => {
              const active = href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
              return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${active ? "bg-blue-100 text-blue-900" : "text-neutral-600 hover:bg-neutral-100"}`}><Icon size={16} />{label}</Link>;
            })}
          </nav>
          <Link href="/dashboard" className="hidden items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-neutral-950 lg:inline-flex"><ArrowLeft size={15} /> User dashboard</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
