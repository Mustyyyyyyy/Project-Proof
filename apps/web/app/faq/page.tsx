import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageLayout } from "../../components/info-page-layout";

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description: "Answers about profiles, project visibility, saved work, and opportunities on ProjectProof.",
};

const questions = [
  {
    question: "Who can see my profile and projects?",
    answer: "Profiles and projects marked public can appear in discovery. Unlisted projects can be opened by people who have the link, while private projects stay in your dashboard. Check the visibility setting before publishing.",
  },
  {
    question: "Can I change a project after publishing it?",
    answer: "Yes. Use My projects in your dashboard to edit project details or change its visibility. You can also remove a project from your portfolio there.",
  },
  {
    question: "How do I keep a project for later?",
    answer: "Sign in and use the save action on a project. Your saved projects are collected in the Saved section of your dashboard.",
  },
  {
    question: "How do I contact a creator?",
    answer: "Open the creator's public profile and use the contact information they have chosen to share. Public email visibility is controlled by the creator.",
  },
  {
    question: "How do I contact ProjectProof support?",
    answer: "A support address has not been configured yet. The Contact page explains the current options and what remains to be set up before launch.",
  },
];

export default function FaqPage() {
  return (
    <InfoPageLayout eyebrow="Help" title="Frequently asked questions" description="A quick guide to sharing work, controlling visibility, and finding your way around ProjectProof.">
      <section className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white px-6">
        {questions.map(({ question, answer }) => (
          <article key={question} className="py-6">
            <h2 className="text-lg font-semibold">{question}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">{answer}</p>
          </article>
        ))}
      </section>
      <p className="text-sm text-neutral-600">Need another place to start? <Link href="/how-it-works" className="font-semibold text-blue-700">See how ProjectProof works</Link>.</p>
    </InfoPageLayout>
  );
}
