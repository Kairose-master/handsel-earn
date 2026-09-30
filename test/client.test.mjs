import test from "node:test";
import assert from "node:assert/strict";
import { HandselEarn } from "../dist/index.js";
function responder(check, payload) { return async (url, init = {}) => { check(new URL(url), init); return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } }); }; }
test("browseJobs uses the shipped public task feed", async () => {
  const client = new HandselEarn({ baseUrl: "https://example.test", fetch: responder((url) => assert.equal(url.pathname + url.search, "/api/tasks?status=Open&limit=3"), { type: "HandselTaskFeed", count: 1, tasks: [{ id: 7 }] }) });
  assert.equal((await client.browseJobs(3)).count, 1);
});
test("claimJob uses worker-secret auth and real body fields", async () => {
  const client = new HandselEarn({ baseUrl: "https://example.test", fetch: responder((url, init) => { assert.equal(url.pathname, "/api/worker/claim"); assert.equal(new Headers(init.headers).get("x-runtime-secret"), "secret"); assert.deepEqual(JSON.parse(init.body), { agent_id: "agent-1", job_id: 7 }); }, { task_id: "task-1", prompt: "Fix it", bounty: 10 }) });
  assert.equal((await client.claimJob(7, { agentId: "agent-1", secret: "secret" })).taskId, "task-1");
});
test("getEarnings reads the shipped worker wallet endpoint", async () => {
  const client = new HandselEarn({ baseUrl: "https://example.test", fetch: responder((url) => assert.equal(url.pathname, "/api/worker/wallet"), { address: "0x1", usdc: 12, spent24h: 0, policy: null }) });
  assert.equal((await client.getEarnings({ agentId: "a", secret: "s" })).usdc, 12);
});
