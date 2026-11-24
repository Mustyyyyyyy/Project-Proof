import type { Metadata } from "next";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "Draft privacy notice for the ProjectProof service.",
};

export default function PrivacyPage() {
  return (
    <InfoPageLayout
      eyebrow="Legal · Draft"
      title="Privacy notice"
      description="This starter notice describes the current product at a high level. It is not a substitute for a reviewed privacy policy."
    >
      <p className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><strong>Draft for review:</strong> Confirm the legal operator, jurisdiction, hosting and analytics providers, retention periods, and user-rights process before launch. This draft is not legal advice.</p>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Information used by the service</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">ProjectProof uses account details such as an email address, username, and profile name to provide accounts. Creators may add profile and project details, including images, descriptions, categories, links, and visibility choices. The service also stores account-related actions such as saved projects and likes.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Authentication and cookies</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">The current application uses authentication cookies to maintain a signed-in session. These cookies are configured as HTTP-only and same-site; secure transport is enabled in production. Passwords are stored as bcrypt hashes rather than readable passwords.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Public information and your choices</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">Profiles and projects may be shown publicly according to their visibility settings. A creator can choose whether their account email is shown on their public profile. Review project and profile visibility before adding information you do not want shared.</p>
      </section>
      <section className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="text-xl font-semibold">Details to complete before launch</h2>
        <p className="mt-3 text-sm leading-6 text-neutral-600">The final policy should identify the service operator and contact channel, explain database and image-storage providers, describe any analytics or logs, set retention and deletion practices, and explain how users can exercise rights available in their location. Those operational details have not been supplied for this project and are intentionally not guessed here.</p>
      </section>
    </InfoPageLayout>
  );
}
