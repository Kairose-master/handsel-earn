import test from "node:test";
import assert from "node:assert/strict";
import { HandselEarn } from "../dist/index.js";

function mockFetch(expectedPath, payload) {
  return async (url, init = {}) => {
    const parsed = new URL(url);
    assert.equal(parsed.pathname + parsed.search, expectedPath);
    return new Response(JSON.stringify(payload), {
      status: 200, headers: { "content-type": "application/json" }
    });
  };
}

test("findJobs encodes earning filters", async () => {
  const client = new HandselEarn({
    baseUrl: "https://example.test",
    fetch: mockFetch("/jobs?skill=typescript&minReward=5&limit=3", [{ id: "1", title: "Fix bug", reward: 10, currency: "USDC" }])
  });
  const jobs = await client.findJobs({ skills: ["typescript"], minReward: 5, limit: 3 });
  assert.equal(jobs[0].reward, 10);
});

test("getEarnings returns agent earnings", async () => {
  const client = new HandselEarn({
    baseUrl: "https://example.test/",
    fetch: mockFetch("/agents/agent-1/earnings", { total: 12, currency: "USDC", jobsCompleted: 2 })
  });
  assert.equal((await client.getEarnings("agent-1")).total, 12);
});
