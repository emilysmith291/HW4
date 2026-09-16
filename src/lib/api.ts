// Points at the live Modal deployment once it exists. NEXT_PUBLIC_API_URL is
// set as a Vercel env var for the deployed site; the localhost fallback is
// for local dev against `uvicorn serve:app --reload` only — never shipped.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type StatLine = {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  k?: number;
};

export type PlayerComp = {
  season: number;
  player: string;
  team: string;
  position: string;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  distance: number;
  style: Record<string, number>;
};

export type CompareResponse = {
  query: StatLine;
  style: Record<string, number>;
  comps: PlayerComp[];
};

export type ApiInfo = {
  steps: string[];
  raw_features: string[];
  engineered_features: string[];
  built_at: string;
  sklearn_version: string;
  n_records: number;
  max_neighbors: number;
};

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : `Request failed with ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.detail ?? body);
  }
  return res.json() as Promise<T>;
}

export function getInfo() {
  return request<ApiInfo>("/info");
}

export function getHealth() {
  return request<{ status: string }>("/health");
}

export function compare(stats: StatLine) {
  return request<CompareResponse>("/compare", {
    method: "POST",
    body: JSON.stringify(stats),
  });
}
