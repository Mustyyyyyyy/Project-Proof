import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Eye, Handshake } from "lucide-react";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "About ProjectProof",
  description: "The purpose and principles behind ProjectProof, a place to share work and discover people through their projects.",
};

export default function AboutPage() {
  return (
    <InfoPageLayout
      eyebrow="About us"
      title="Let the work speak clearly."
      description="ProjectProof is a home for project-led portfolios: a place to tell the story behind your work and make it easier for others to discover what you can do."
    >
      <section className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">Why ProjectProof exists</h2>
        <p className="mt-4 max-w-3xl leading-7 text-neutral-600">A title or résumé can introduce someone, but it does not always show their approach, craft, or contribution. ProjectProof is designed to give projects that missing context—what the challenge was, what decisions were made, and what the creator brought to the result.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-neutral-200 bg-white p-6"><Eye className="text-blue-700" size={22} /><h2 className="mt-4 font-semibold">Evidence over claims</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Make it easier to understand someone&apos;s skills through examples of their work.</p></article>
        <article className="rounded-lg border border-neutral-200 bg-white p-6"><Compass className="text-blue-700" size={22} /><h2 className="mt-4 font-semibold">Discovery across disciplines</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Bring creators, projects, and people looking for talent into one searchable place.</p></article>
        <article className="rounded-lg border border-neutral-200 bg-white p-6"><Handshake className="text-blue-700" size={22} /><h2 className="mt-4 font-semibold">Useful connections</h2><p className="mt-2 text-sm leading-6 text-neutral-600">Help great work become the start of a collaboration, role, or new idea.</p></article>
      </section>
      <section className="rounded-lg bg-neutral-950 p-7 text-white sm:p-9">
        <h2 className="text-2xl font-semibold">Built for makers and curious minds</h2>
        <p className="mt-3 max-w-2xl leading-7 text-neutral-300">Whether you are building a portfolio or looking for your next collaborator, start with the work and the people behind it.</p>
        <Link href="/how-it-works" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-amber-300">See how it works <ArrowRight size={16} /></Link>
      </section>
    </InfoPageLayout>
  );
}
