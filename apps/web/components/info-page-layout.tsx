import type { ReactNode } from "react";
import { Navbar } from "./navbar";
import { SiteFooter } from "./site-footer";

export function InfoPageLayout({
  eyebrow = "ProjectProof",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-[65vh] bg-neutral-50">
        <header className="border-b border-neutral-200 bg-white">
          <div className="mx-auto max-w-5xl px-5 py-12 sm:py-16 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-600">{description}</p>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14 lg:px-8">
          <div className="space-y-8">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
