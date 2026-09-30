import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { HandselEarn } from "../dist/index.js";

// Contract-level integration regression: run the real SDK over HTTP against a
// local server implementing the worker endpoints documented by Handsel main.
// This catches URL, method, payload, auth-header, and response-shape drift
// without creating accounts or moving funds on the live deployment.
test("SDK completes the Handsel external-worker HTTP loop", async (t) => {
  const seen = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).length
      ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
      : undefined;
    seen.push({ method: req.method, url: req.url, secret: req.headers["x-runtime-secret"], body });

    let payload;
    if (req.method === "POST" && req.url === "/api/agents/register") {
      assert.deepEqual(body, {
        email: "worker@example.test", password: "correct horse battery staple",
        name: "integration-worker", auto_mine: false,
        capabilities: ["text", "code"],
      });
      payload = { user_id: "user-1", agent_id: "agent-1", secret: "a".repeat(64), platform_url: `http://127.0.0.1:${server.address().port}`, smart_account_address: "0xabc", reconnected: false };
    } else if (req.method === "GET" && req.url === "/api/tasks?status=Open&limit=5") {
      payload = { type: "HandselTaskFeed", count: 1, tasks: [{ id: 7, title: "Review patch", bounty: 5, currency: "USDC" }] };
    } else if (req.method === "POST" && req.url === "/api/worker/claim") {
      assert.equal(req.headers["x-runtime-secret"], "a".repeat(64));
      assert.deepEqual(body, { agent_id: "agent-1", job_id: 7 });
      payload = { task_id: "task-1", prompt: "Review the patch", bounty: 5 };
    } else if (req.method === "POST" && req.url === "/api/runtime/callback") {
      assert.equal(req.headers["x-runtime-secret"], "a".repeat(64));
      assert.deepEqual(body, { task_id: "task-1", agent_id: "agent-1", success: true, output: "LGTM", quality_score: null, execution_time: 0, token_cost: 0, events: [] });
      payload = { status: "submitted", grading: { status: "pending" } };
    } else if (req.method === "POST" && req.url === "/api/worker/wallet") {
      assert.equal(req.headers["x-runtime-secret"], "a".repeat(64));
      assert.deepEqual(body, { agent_id: "agent-1" });
      payload = { address: "0xabc", usdc: 5, spent24h: 0, policy: { maxPerTx: 5, dailyCap: 20 } };
    } else {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `Unexpected endpoint ${req.method} ${req.url}` }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(payload));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));

  const client = new HandselEarn({ baseUrl: `http://127.0.0.1:${server.address().port}` });
  const agent = await client.register({
    email: "worker@example.test", password: "correct horse battery staple",
    name: "integration-worker", capabilities: ["text", "code"],
  });
  assert.equal(agent.agentId, "agent-1");
  assert.equal(agent.secret, "a".repeat(64));

  const feed = await client.browseJobs(5);
  assert.equal(feed.tasks[0].id, 7);
  const claim = await client.claimJob(feed.tasks[0].id, agent);
  assert.equal(claim.prompt, "Review the patch");
  const submitted = await client.submitWork(claim.taskId, { output: "LGTM" }, agent);
  assert.equal(submitted.status, "submitted");
  const wallet = await client.getEarnings(agent);
  assert.equal(wallet.usdc, 5);

  assert.deepEqual(seen.map(({ method, url }) => [method, url]), [
    ["POST", "/api/agents/register"],
    ["GET", "/api/tasks?status=Open&limit=5"],
    ["POST", "/api/worker/claim"],
    ["POST", "/api/runtime/callback"],
    ["POST", "/api/worker/wallet"],
  ]);
  assert.equal(seen.some(({ url }) => /^\/(agents|jobs)(\/|\?|$)/.test(url)), false);
});
