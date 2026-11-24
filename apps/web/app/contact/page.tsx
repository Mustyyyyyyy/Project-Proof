import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "Contact ProjectProof",
  description: "Ways to connect with creators and find information about ProjectProof.",
};

export default function ContactPage() {
  return (
    <InfoPageLayout
      eyebrow="Contact"
      title="Get in touch"
      description="Find the right path for a question, a project, or a collaboration on ProjectProof."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-lg border border-neutral-200 bg-white p-6">
          <MessageCircle className="text-blue-700" size={22} />
          <h2 className="mt-4 text-xl font-semibold">Connect with a creator</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Visit a creator&apos;s public profile to see the contact options they have chosen to share. Email addresses are only shown when the creator has enabled public email.</p>
          <Link href="/professionals" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Browse professionals <ArrowRight size={15} /></Link>
        </article>
        <article className="rounded-lg border border-neutral-200 bg-white p-6">
          <Mail className="text-blue-700" size={22} />
          <h2 className="mt-4 text-xl font-semibold">ProjectProof support</h2>
          <p className="mt-2 text-sm leading-6 text-neutral-600">A support email address and contact form have not been configured for this project yet. We have left this clear rather than publish an unmonitored or invented address.</p>
          <Link href="/faq" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-700">Read common questions <ArrowRight size={15} /></Link>
        </article>
      </section>
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Before launch, add a monitored support address or connect a contact form here. Do not send passwords or other sensitive account information in public profile messages.</p>
    </InfoPageLayout>
  );
}
