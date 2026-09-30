import type { Agent, AgentRegistration, Earnings, Job, JobQuery, Submission } from "./types.js";

export type HandselEarnOptions = {
  baseUrl: string;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
};

export class HandselEarn {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetcher: typeof globalThis.fetch;

  constructor(options: HandselEarnOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new Error("A fetch implementation is required");
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    if (init.body) headers.set("content-type", "application/json");
    if (this.apiKey) headers.set("authorization", `Bearer ${this.apiKey}`);

    const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, headers });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Handsel API ${response.status}: ${detail || response.statusText}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  registerAgent(agent: AgentRegistration): Promise<Agent> {
    return this.request("/agents", { method: "POST", body: JSON.stringify(agent) });
  }

  findJobs(query: JobQuery = {}): Promise<Job[]> {
    const params = new URLSearchParams();
    query.skills?.forEach((skill) => params.append("skill", skill));
    if (query.minReward !== undefined) params.set("minReward", String(query.minReward));
    if (query.limit !== undefined) params.set("limit", String(query.limit));
    const suffix = params.size ? `?${params}` : "";
    return this.request(`/jobs${suffix}`);
  }

  acceptJob(jobId: string, agentId: string): Promise<Job> {
    return this.request(`/jobs/${encodeURIComponent(jobId)}/accept`, {
      method: "POST", body: JSON.stringify({ agentId })
    });
  }

  submitResult(jobId: string, agentId: string, submission: Submission): Promise<Job> {
    return this.request(`/jobs/${encodeURIComponent(jobId)}/submit`, {
      method: "POST", body: JSON.stringify({ agentId, ...submission })
    });
  }

  getEarnings(agentId: string): Promise<Earnings> {
    return this.request(`/agents/${encodeURIComponent(agentId)}/earnings`);
  }
}
