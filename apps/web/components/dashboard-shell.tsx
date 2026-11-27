"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  Compass,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Bell,
  Handshake,
  Plus,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navigation: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My projects", href: "/dashboard/projects", icon: FolderKanban },
  { label: "Saved", href: "/dashboard/saved", icon: Bookmark },
  { label: "My profile", href: "/dashboard/profile/edit", icon: UserRound },
  { label: "Messages", href: "/dashboard/messages", icon: Mail },
  { label: "Requests", href: "/dashboard/requests", icon: Handshake },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
  { label: "Discover", href: "/discover", icon: Compass },
  { label: "Opportunities", href: "/opportunities", icon: BriefcaseBusiness },
];
const pageTitles: Readonly<Record<string, string>> = {
  "/dashboard/projects": "My projects",
  "/dashboard/projects/new": "Add project",
  "/dashboard/saved": "Saved projects",
  "/dashboard/profile/edit": "Edit profile",
  "/dashboard/messages": "Messages",
  "/dashboard/requests": "Hire & collaboration requests",
  "/dashboard/notifications": "Notifications",
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const isOverview = pathname === "/dashboard";
  const pageTitle = pageTitles[pathname]
    || (pathname.endsWith("/edit") ? "Edit project" : pathname.split("/").filter(Boolean).slice(1).map((part) => part.replaceAll("-", " ")).join(" / "));

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        setIsAdmin(result.data?.user?.role === "ADMIN");
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Could not check administrator access:", error);
        }
      });
    return () => controller.abort();
  }, []);

  async function signOut() {
    setSigningOut(true);
    setSignOutError("");
    try {
      const response = await fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
      if (!response.ok) throw new Error("Could not sign out. Please try again.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setSigningOut(false);
      setSignOutError(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    }
  }

  function renderLinks(mobile = false) {
    const items = isAdmin
      ? [...navigation, { label: "Administration", href: "/admin", icon: ShieldCheck }]
      : navigation;
    return items.map(({ label, href, icon: Icon }) => {
      const active = href === "/dashboard"
        ? pathname === href
        : pathname === href || pathname.startsWith(`${href}/`);
      return (
        <Link
          key={href}
          href={href}
          onClick={() => mobile && setMenuOpen(false)}
          aria-current={active ? "page" : undefined}
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${active ? "bg-blue-100 text-blue-900" : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"} ${mobile ? "w-full" : ""}`}
        >
          <Icon size={16} strokeWidth={1.8} />
          {label}
        </Link>
      );
    });
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2 font-bold tracking-tight">
            <span className="grid size-9 place-items-center rounded-md bg-blue-700 text-sm text-white">PP</span>
            <span>ProjectProof</span>
          </Link>

          <nav aria-label="Dashboard navigation" className="ml-auto hidden items-center gap-1 xl:flex">
            {renderLinks()}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            <Link href="/dashboard/projects/new" className="inline-flex h-10 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800">
              <Plus size={16} /> Add project
            </Link>
            <button onClick={() => void signOut()} disabled={signingOut} className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-60">
              <LogOut size={16} /> {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>

          <button onClick={() => setMenuOpen((open) => !open)} className="ml-auto rounded-md p-2 text-neutral-700 hover:bg-neutral-100 xl:hidden" aria-label={menuOpen ? "Close dashboard navigation" : "Open dashboard navigation"} aria-expanded={menuOpen}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-neutral-200 bg-white px-4 py-4 sm:px-6 xl:hidden">
            <nav aria-label="Dashboard navigation" className="grid gap-1 sm:grid-cols-2">
              {renderLinks(true)}
            </nav>
            <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row">
              <Link href="/dashboard/projects/new" onClick={() => setMenuOpen(false)} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white">
                <Plus size={16} /> Add project
              </Link>
              <button onClick={() => void signOut()} disabled={signingOut} className="inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-60">
                <LogOut size={16} /> {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {!isOverview && (
          <div className="flex min-h-14 items-center gap-3 border-b border-neutral-200">
            <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-2 rounded-md py-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950">
              <ArrowLeft size={17} /> <span className="hidden sm:inline">Back to dashboard</span><span className="sm:hidden">Dashboard</span>
            </Link>
            <span className="text-neutral-300">/</span>
            <span className="truncate text-sm font-semibold capitalize text-neutral-800">{pageTitle}</span>
          </div>
        )}
        {signOutError && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{signOutError}</p>}
        <div className="mx-auto max-w-7xl py-6 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
