import Link from "next/link";

const exploreLinks = [
  { label: "Discover projects", href: "/discover" },
  { label: "Professionals", href: "/professionals" },
  { label: "Opportunities", href: "/opportunities" },
  { label: "Search", href: "/search" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "How it works", href: "/how-it-works" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Copyright", href: "/copyright" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-md bg-blue-700 text-xs text-white">PP</span>
            ProjectProof
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-600">Show the work. Share the proof. Discover people through the projects they create.</p>
        </div>
        <FooterLinks title="Explore" links={exploreLinks} />
        <FooterLinks title="ProjectProof" links={companyLinks} />
        <FooterLinks title="Information" links={legalLinks} />
      </div>
      <div className="border-t border-neutral-200">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-4 text-xs text-neutral-500 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>© {year} ProjectProof. All rights reserved.</p>
          <p>Creators retain responsibility for the work they share.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-neutral-950">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {links.map(({ label, href }) => <li key={href}><Link href={href} className="text-sm text-neutral-600 transition hover:text-neutral-950">{label}</Link></li>)}
      </ul>
    </nav>
  );
}
