import type { Metadata } from "next";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Draft terms of use for the ProjectProof service.",
};

export default function TermsPage() {
  return (
    <InfoPageLayout
      eyebrow="Legal · Draft"
      title="Terms of use"
      description="These starter terms explain basic expectations for using ProjectProof and require review before launch."
    >
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Draft for review:</strong> These terms are not legal advice. Have the service operator and a qualified reviewer confirm the governing law, liability language, dispute process, and other required terms before accepting users.</p>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Accounts and responsible use</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">Keep your account credentials secure and provide information you are entitled to use. Do not misuse the service, attempt to access another person&apos;s account, or upload content that is unlawful or violates another person&apos;s rights.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Your content</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">You remain responsible for the content you submit and should only share work you own or have permission to publish. By publishing content, you allow ProjectProof to store and display it as needed to operate the service and show it to the audience allowed by your visibility settings. Uploaded images may be processed and stored by Cloudinary when that integration is enabled. The exact scope of these permissions and third-party processing terms should be confirmed by the service operator before launch.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Visibility and changes</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">You are responsible for checking whether a profile or project is public, unlisted, or private. ProjectProof may change as the product develops; a complete version of these terms should explain how material changes will be communicated and how accounts or content can be removed.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Terms that still need operator review</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">Before launch, add the operating entity, effective date, governing law, age requirements, service availability and warranty terms, liability limits, termination process, and a working contact method. These details depend on the operator and jurisdiction and are not invented here.</p>
      </section>
    </InfoPageLayout>
  );
}
