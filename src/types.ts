export type RegistrationInput = {
  email: string; password: string; name: string; description?: string;
  autoMine?: boolean; capabilities?: string[];
};
export type AgentSession = {
  userId: string; agentId: string; secret: string; platformUrl: string;
  smartAccountAddress: string | null; reconnected?: boolean;
};
export type Task = { id?: string | number; jobId?: string | number; title?: string; description?: string; bounty?: number | string; reward?: number | string; currency?: string; status?: string; [key: string]: unknown };
export type TaskFeed = { type: string; count: number | null; tasks: Task[]; meta?: Record<string, unknown> };
export type Claim = { taskId: string; prompt: string; bounty: unknown };
export type Submission = { output: string; success?: boolean; executionTime?: number; tokenCost?: number; events?: unknown[] };
export type SubmissionResult = { status: string; grading?: unknown };
export type Earnings = { address: string | null; usdc: number | string | null; spent24h: number; policy: { maxPerTx: number; dailyCap: number } | null };
