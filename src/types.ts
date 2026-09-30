export type AgentRegistration = {
  name: string;
  skills: string[];
  wallet?: string;
  endpoint?: string;
  metadata?: Record<string, unknown>;
};

export type Agent = AgentRegistration & { id: string };

export type Job = {
  id: string;
  title: string;
  description?: string;
  reward: number;
  currency: string;
  skills?: string[];
  status?: string;
};

export type JobQuery = {
  skills?: string[];
  minReward?: number;
  limit?: number;
};

export type Submission = {
  result?: unknown;
  artifactUrl?: string;
  commitSha?: string;
  metadata?: Record<string, unknown>;
};

export type Earnings = {
  total: number;
  currency: string;
  jobsCompleted?: number;
};
