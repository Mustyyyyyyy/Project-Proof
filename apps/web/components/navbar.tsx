"use client";

import Link from "next/link";
import { Menu, Search, Bell, MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/v1/auth/me`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => {
        if (response.ok) setAuthenticated(true);
        setSessionChecked(true);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Could not check the current session:", error);
          setSessionChecked(true);
        }
      });
    return () => controller.abort();
  }, []);

  if (!sessionChecked || authenticated) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight">
          <span className="grid size-8 place-items-center rounded-md bg-blue-700 text-sm text-white">PP</span>
          <span className="hidden sm:inline">ProjectProof</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium lg:flex">
          <Link href="/discover">Discover</Link><Link href="/professionals">Professionals</Link><Link href="/opportunities">Opportunities</Link>
        </nav>
        <Link href="/search" className="ml-auto hidden h-10 w-full max-w-xs items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500 md:flex">
          <Search size={17}/> Search projects, people, skills...
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <button className="p-2" aria-label="Notifications"><Bell size={19}/></button>
          <button className="p-2" aria-label="Messages"><MessageCircle size={19}/></button>
          <Link href="/login" className="px-3 py-2 text-sm font-semibold">Sign in</Link>
          <Link href="/register" className="rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Create account</Link>
        </div>
        <button className="ml-auto p-2 sm:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
      </div>
      {open && <div className="border-t border-neutral-200 bg-white px-5 py-4 sm:hidden"><nav className="flex flex-col gap-4 text-sm font-semibold"><Link href="/discover">Discover</Link><Link href="/professionals">Professionals</Link><Link href="/opportunities">Opportunities</Link><Link href="/login">Sign in</Link><Link href="/register">Create account</Link></nav></div>}
    </header>
  );
}
