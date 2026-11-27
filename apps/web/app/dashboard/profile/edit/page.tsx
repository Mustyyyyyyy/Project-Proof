"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { CloudinaryImageField } from "../../../../components/cloudinary-image-field";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

interface EditableProfile {
  fullName: string;
  professionalTitle: string | null;
  bio: string | null;
  location: string | null;
  country: string | null;
  website: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  availability: string | null;
  publicEmail: boolean;
}

const emptyProfile: EditableProfile = {
  fullName: "",
  professionalTitle: "",
  bio: "",
  location: "",
  country: "",
  website: "",
  avatarUrl: "",
  coverUrl: "",
  availability: "",
  publicEmail: false,
};

export default function EditProfilePage() {
  const [profile, setProfile] = useState<EditableProfile>(emptyProfile);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/v1/auth/me`, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (response.status === 401) throw new Error("Sign in to edit your profile.");
        if (!response.ok) throw new Error(result.error?.message || "Your profile could not be loaded.");
        return result.data.user as { username: string; profile: Partial<EditableProfile> | null };
      })
      .then((user) => {
        if (!active) return;
        if (!user.profile) throw new Error("Your account has no profile to edit.");
        setUsername(user.username);
        setProfile({ ...emptyProfile, ...user.profile });
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Your profile could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function update<K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/v1/profiles/me`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          professionalTitle: profile.professionalTitle || null,
          bio: profile.bio || null,
          location: profile.location || null,
          country: profile.country || null,
          website: profile.website || null,
          avatarUrl: profile.avatarUrl || null,
          coverUrl: profile.coverUrl || null,
          availability: profile.availability || null,
          publicEmail: profile.publicEmail,
        }),
      });
      const result = await response.json();
      if (response.status === 401) throw new Error("Your session expired. Sign in again to save changes.");
      if (!response.ok) throw new Error(result.error?.message || "Profile changes could not be saved.");
      setNotice("Profile updated.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Profile changes could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl">
        <h1 className="mt-4 text-3xl font-semibold">Edit your profile</h1>
        <p className="mt-2 text-sm text-neutral-600">Add the details you want potential collaborators to see.</p>
        {loading ? (
          <p className="mt-8 rounded-lg border p-6 text-sm text-neutral-500">Loading your profile…</p>
        ) : error && !username ? (
          <section className="mt-8 rounded-lg border p-6">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <Link href="/login" className="mt-4 inline-flex rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Sign in</Link>
          </section>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-5 rounded-lg border p-6">
            <label className="block text-sm font-semibold">Full name
              <input required maxLength={100} value={profile.fullName} onChange={(event) => update("fullName", event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold">Professional title
              <input maxLength={120} value={profile.professionalTitle ?? ""} onChange={(event) => update("professionalTitle", event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" placeholder="e.g. Product designer" />
            </label>
            <label className="block text-sm font-semibold">Bio
              <textarea rows={5} maxLength={2000} value={profile.bio ?? ""} onChange={(event) => update("bio", event.target.value)} className="mt-2 w-full rounded-md border p-3 font-normal" placeholder="Tell people what you do and what kinds of work interest you." />
              <span className="mt-1 block text-xs font-normal text-neutral-500">{(profile.bio ?? "").length}/2000 characters</span>
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold">City or region
                <input maxLength={120} value={profile.location ?? ""} onChange={(event) => update("location", event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
              </label>
              <label className="block text-sm font-semibold">Country
                <input maxLength={100} value={profile.country ?? ""} onChange={(event) => update("country", event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" />
              </label>
            </div>
            <label className="block text-sm font-semibold">Website
              <input type="url" maxLength={2048} value={profile.website ?? ""} onChange={(event) => update("website", event.target.value)} className="mt-2 h-11 w-full rounded-md border px-3 font-normal" placeholder="https://" />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <CloudinaryImageField label="Profile image URL" purpose="profile" value={profile.avatarUrl ?? ""} onChange={(value) => update("avatarUrl", value)} />
              <CloudinaryImageField label="Cover image URL" purpose="profile" value={profile.coverUrl ?? ""} onChange={(value) => update("coverUrl", value)} />
            </div>
            <label className="block text-sm font-semibold">Availability
              <select value={profile.availability ?? ""} onChange={(event) => update("availability", event.target.value)} className="mt-2 h-11 w-full rounded-md border bg-white px-3 font-normal">
                <option value="">Not specified</option>
                <option value="AVAILABLE">Available for opportunities</option>
                <option value="LIMITED">Limited availability</option>
                <option value="UNAVAILABLE">Not available</option>
              </select>
            </label>
            <label className="flex items-start gap-3 rounded-md bg-neutral-50 p-4 text-sm">
              <input type="checkbox" checked={profile.publicEmail} onChange={(event) => update("publicEmail", event.target.checked)} className="mt-0.5 size-4 accent-blue-700" />
              <span><span className="font-semibold">Show my email publicly</span><span className="mt-1 block text-neutral-600">When enabled, visitors can see and email your account address from your public profile. Leave this off to keep it private.</span></span>
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {notice && <p role="status" className="text-sm text-green-800">{notice}</p>}
            <div className="flex flex-wrap justify-end gap-3">
              <Link href={username ? `/profile/${username}` : "/dashboard"} className="rounded-md border px-4 py-2.5 text-sm font-semibold">View profile</Link>
              <button disabled={saving} className="rounded-md bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save profile"}</button>
            </div>
          </form>
        )}
    </main>
  );
}
