import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Globe, MapPin } from "lucide-react";
import { Navbar } from "../../../components/navbar";
import { ContactCreatorActions } from "../../../components/contact-creator-actions";
import { apiGet } from "../../../lib/api";

interface PublicProfile {
  username: string;
  fullName: string;
  professionalTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string | null;
  country: string | null;
  website: string | null;
  isVerified: boolean;
  email?: string;
  projects: {
    id: string;
    slug: string;
    title: string;
    shortDescription: string;
    coverUrl: string | null;
    category: { name: string } | null;
    _count: { likes: number };
  }[];
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  let profile: PublicProfile | null = null;
  let error = "";
  try {
    profile = await apiGet<PublicProfile>(`/api/v1/profiles/${encodeURIComponent(username)}`, undefined, { revalidateSeconds: 30 });
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Profile could not be loaded.";
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-5 pb-16 lg:px-8">
        <div className="relative h-44 overflow-hidden rounded-b-lg bg-neutral-900 sm:h-52">
          {profile?.coverUrl && <Image src={profile.coverUrl} alt="" fill className="object-cover" sizes="100vw" />}
        </div>
        {error ? (
          <p role="alert" className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">{error}</p>
        ) : profile ? (
          <>
            <section className="relative grid gap-6 px-2 sm:px-6 lg:grid-cols-[1fr_280px]">
              <div className="-mt-12 flex flex-col gap-5 sm:flex-row sm:items-end">
                {profile.avatarUrl ? (
                  <Image src={profile.avatarUrl} alt="" width={96} height={96} className="size-24 rounded-full border-4 border-white object-cover" />
                ) : (
                  <span className="grid size-24 place-items-center rounded-full border-4 border-white bg-neutral-900 text-2xl font-bold text-white">{profile.fullName.slice(0, 2).toUpperCase()}</span>
                )}
                <div className="pb-1 mt-12">
                  <h1 className="flex items-center gap-2 text-3xl font-semibold">
                    {profile.fullName}
                    {profile.isVerified && <BadgeCheck className="text-blue-700" size={21} aria-label="Verified" />}
                  </h1>
                  <p className="mt-5 text-neutral-600">{profile.professionalTitle} · @{profile.username}</p>
                  {(profile.location || profile.country) && <p className="mt-2 flex items-center gap-1.5 text-sm text-neutral-500"><MapPin size={15} />{[profile.location, profile.country].filter(Boolean).join(", ")}</p>}
                </div>
              </div>
              <ContactCreatorActions username={profile.username} />
            </section>
            <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_280px]">
              <div>
                <h2 className="text-2xl font-semibold">Projects</h2>
                {profile.projects.length ? (
                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {profile.projects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.slug}`} className="overflow-hidden rounded-lg border">
                        <div className="relative aspect-[16/10] bg-neutral-100">
                          {project.coverUrl && <Image src={project.coverUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 50vw" />}
                        </div>
                        <div className="p-4">
                          <p className="text-xs font-bold text-blue-700">{project.category?.name ?? "Project"}</p>
                          <h3 className="mt-2 font-semibold">{project.title}</h3>
                          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{project.shortDescription}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-neutral-500">No public projects have been published yet.</p>
                )}
              </div>
              <aside className="h-fit rounded-lg border p-5">
                <h2 className="font-semibold">About</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-6 text-neutral-600">{profile.bio || "This professional has not added a bio yet."}</p>
                {profile.website && <a href={profile.website} target="_blank" rel="noreferrer" className="mt-5 flex items-center gap-2 text-sm text-blue-700"><Globe size={15} /> Website</a>}
              </aside>
            </section>
          </>
        ) : null}
      </main>
    </>
  );
}
