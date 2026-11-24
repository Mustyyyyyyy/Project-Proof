const API_URL = process.env.API_SERVER_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")
  || process.env.NEXT_PUBLIC_API_URL
  || "http://localhost:4000";

export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  coverUrl: string | null;
  viewCount: number;
  category: { name: string } | null;
  creator: {
    username: string;
    profile: {
      fullName: string;
      professionalTitle: string | null;
      avatarUrl: string | null;
      location: string | null;
      country: string | null;
    } | null;
  };
  _count: { likes: number };
}

interface ApiResponse<T> {
  data?: T;
  error?: { message?: string };
}

export async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, cache: "no-store" });
  } catch {
    throw new Error("The ProjectProof API is unavailable. Start the API server and try again.");
  }

  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error("The ProjectProof API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(body.error?.message || `The API request failed (${response.status}).`);
  }
  if (body.data === undefined) throw new Error("The API response did not contain the expected data.");
  return body.data;
}
