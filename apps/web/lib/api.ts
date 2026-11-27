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

export interface ApiResult<T> {
  data?: T;
  error?: { message?: string };
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export interface ApiCacheOptions {
  revalidateSeconds?: number;
}

export async function apiGetResult<T>(
  path: string,
  init?: RequestInit,
  cacheOptions?: ApiCacheOptions,
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    const fetchOptions = cacheOptions?.revalidateSeconds
      ? { ...init, next: { revalidate: cacheOptions.revalidateSeconds } }
      : { ...init, cache: "no-store" as const };
    response = await fetch(`${API_URL}${path}`, fetchOptions);
  } catch {
    throw new Error("The ProjectProof API is unavailable. Start the API server and try again.");
  }

  let body: ApiResult<T>;
  try {
    body = (await response.json()) as ApiResult<T>;
  } catch {
    throw new Error("The ProjectProof API returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(body.error?.message || `The API request failed (${response.status}).`);
  }
  if (body.data === undefined) throw new Error("The API response did not contain the expected data.");
  return body;
}

export async function apiGet<T>(
  path: string,
  init?: RequestInit,
  cacheOptions?: ApiCacheOptions,
): Promise<T> {
  const body = await apiGetResult<T>(path, init, cacheOptions);
  return body.data;
}
