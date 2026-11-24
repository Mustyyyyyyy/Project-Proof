import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Compass, FolderKanban, UserRound } from "lucide-react";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "How it works",
  description: "Learn how to build a project portfolio, discover creative work, and find opportunities on ProjectProof.",
};

const creatorSteps = [
  {
    number: "01",
    title: "Create your profile",
    description: "Add your name, focus, location, and the details you want potential collaborators to know.",
    icon: UserRound,
  },
  {
    number: "02",
    title: "Show the work",
    description: "Create project pages with a clear summary, context, category, links, and your contribution.",
    icon: FolderKanban,
  },
  {
    number: "03",
    title: "Choose what is visible",
    description: "Publish projects publicly, share an unlisted link, or keep a project private in your workspace.",
    icon: Compass,
  },
  {
    number: "04",
    title: "Explore what comes next",
    description: "Browse other projects, save work for later, and look through opportunities and collaborations.",
    icon: BriefcaseBusiness,
  },
];

export default function HowItWorksPage() {
  return (
    <InfoPageLayout
      eyebrow="A practical portfolio"
      title="How ProjectProof works"
      description="ProjectProof brings your profile, project stories, and discovery into one place—so people can understand not only what you made, but how you work."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        {creatorSteps.map(({ number, title, description, icon: Icon }) => (
          <article key={number} className="rounded-lg border border-neutral-200 bg-white p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-blue-700">{number}</span>
              <Icon size={20} className="text-blue-700" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
          </article>
        ))}
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
        <h2 className="text-2xl font-semibold">For people discovering talent</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-3">
          <div><h3 className="font-semibold">Explore by discipline</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Browse public projects and professional profiles to see the work behind someone&apos;s skills.</p></div>
          <div><h3 className="font-semibold">Save useful examples</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Save projects to your account so you can return to them later.</p></div>
          <div><h3 className="font-semibold">Find opportunities</h3><p className="mt-2 text-sm leading-6 text-neutral-600">Look through roles, freelance work, and collaborations shared on the opportunities board.</p></div>
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link href="/register" className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-5 py-3 text-sm font-semibold text-white">Create your portfolio <ArrowRight size={16} /></Link>
        <Link href="/discover" className="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold">Explore projects</Link>
      </div>
    </InfoPageLayout>
  );
}
