"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  || (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");

export function GoogleAuthLink({ label }: { label: string }) {
  return (
    <a
      href={`${API_URL}/api/v1/auth/google`}
      className="mt-4 flex h-11 w-full items-center justify-center gap-3 rounded-md border border-neutral-300 bg-white text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
    >
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94a11.05 11.05 0 0 1-4.8 7.24l7.72 5.99c4.5-4.16 7.12-10.29 7.12-17.7Z" transform="translate(0 0)" />
        <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1-.75-4.59c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z" transform="translate(0 0)" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.77l-7.72-5.99c-2.14 1.43-4.88 2.28-8.18 2.28-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
      </svg>
      {label}
    </a>
  );
}
