import type { Metadata } from "next";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "Copyright",
  description: "Copyright and user-submitted work information for ProjectProof.",
};

export default function CopyrightPage() {
  const year = new Date().getFullYear();
  return (
    <InfoPageLayout
      eyebrow="Copyright"
      title="Respect the work."
      description="ProjectProof is built around sharing creative work with clear context and respect for the people who made it."
    >
      <section className="rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
        <p className="text-lg font-semibold">© {year} ProjectProof. All rights reserved.</p>
        <p className="mt-4 text-sm leading-6 text-neutral-600">The ProjectProof name, visual identity, and original site materials are associated with this project. The legal owner and registration details should be confirmed by the project operator before launch.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Creator-submitted work</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">Project creators are responsible for sharing work they own or are authorized to display. A project page does not transfer ownership of the work to ProjectProof. If you believe material on the service infringes your rights, use the ProjectProof contact page once an official support channel has been configured.</p>
      </section>
      <p className="text-sm leading-6 text-neutral-600">This page is a starter notice, not legal advice. Confirm ownership and any formal takedown process before launch.</p>
    </InfoPageLayout>
  );
}
