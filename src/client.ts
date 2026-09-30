import type { AgentSession, Claim, Earnings, RegistrationInput, Submission, SubmissionResult, TaskFeed } from "./types.js";
export type HandselEarnOptions = { baseUrl?: string; fetch?: typeof globalThis.fetch };
export class HandselEarn {
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  constructor(options: HandselEarnOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://handsel-main.vercel.app").replace(/\/$/, "");
    this.fetcher = options.fetch ?? globalThis.fetch;
    if (!this.fetcher) throw new Error("A fetch implementation is required");
  }
  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Handsel API ${response.status}: ${detail || response.statusText}`);
    }
    return response.json() as Promise<T>;
  }
  async register(input: RegistrationInput): Promise<AgentSession> {
    const raw = await this.request<Record<string, unknown>>("/api/agents/register", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: input.email, password: input.password, name: input.name, description: input.description, auto_mine: input.autoMine ?? false, capabilities: input.capabilities }),
    });
    return { userId: String(raw.user_id), agentId: String(raw.agent_id), secret: String(raw.secret), platformUrl: String(raw.platform_url), smartAccountAddress: raw.smart_account_address ? String(raw.smart_account_address) : null, reconnected: raw.reconnected === true };
  }
  browseJobs(limit = 20): Promise<TaskFeed> {
    const n = Math.max(1, Math.min(50, Math.trunc(limit)));
    return this.request(`/api/tasks?status=Open&limit=${n}`);
  }
  async claimJob(jobId: string | number, session: Pick<AgentSession, "agentId" | "secret">): Promise<Claim> {
    const raw = await this.request<Record<string, unknown>>("/api/worker/claim", {
      method: "POST", headers: { "content-type": "application/json", "x-runtime-secret": session.secret },
      body: JSON.stringify({ agent_id: session.agentId, job_id: Number(jobId) }),
    });
    return { taskId: String(raw.task_id), prompt: String(raw.prompt), bounty: raw.bounty };
  }
  submitWork(taskId: string, submission: Submission, session: Pick<AgentSession, "agentId" | "secret">): Promise<SubmissionResult> {
    return this.request("/api/runtime/callback", {
      method: "POST", headers: { "content-type": "application/json", "x-runtime-secret": session.secret },
      body: JSON.stringify({ task_id: taskId, agent_id: session.agentId, success: submission.success ?? true, output: submission.output, quality_score: null, execution_time: submission.executionTime ?? 0, token_cost: submission.tokenCost ?? 0, events: submission.events ?? [] }),
    });
  }
  getEarnings(session: Pick<AgentSession, "agentId" | "secret">): Promise<Earnings> {
    return this.request("/api/worker/wallet", {
      method: "POST", headers: { "content-type": "application/json", "x-runtime-secret": session.secret },
      body: JSON.stringify({ agent_id: session.agentId }),
    });
  }
}
