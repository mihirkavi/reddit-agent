import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

async function mockReddit() {
  const requests = [];
  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString("utf8");
    requests.push({ method: request.method, url: request.url, body, headers: request.headers });
    response.setHeader("content-type", "application/json");
    response.setHeader("x-ratelimit-remaining", "99");
    if (request.url === "/api/v1/access_token") {
      response.end(JSON.stringify({ access_token: "access-token", token_type: "bearer", expires_in: 3600, scope: "identity read submit" }));
    } else if (request.url.startsWith("/api/v1/me")) {
      response.end(JSON.stringify({ kind: "t2", data: { name: "test_account", id: "abc", total_karma: 42 } }));
    } else if (request.url.startsWith("/api/comment")) {
      response.end(JSON.stringify({ json: { errors: [], data: { things: [{ kind: "t1", data: { id: "newcomment" } }] } } }));
    } else if (request.url.startsWith("/api/submit")) {
      response.end(JSON.stringify({ json: { errors: [], data: { url: "https://www.reddit.com/r/test/comments/newpost/", id: "newpost", name: "t3_newpost" } } }));
    } else if (request.url.startsWith("/r/test/new")) {
      response.end(JSON.stringify({ kind: "Listing", data: { after: null, children: [{ kind: "t3", data: { id: "post1", title: "Hello" } }] } }));
    } else {
      response.statusCode = 404;
      response.end(JSON.stringify({ error: 404 }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return { server, requests, origin: `http://127.0.0.1:${server.address().port}` };
}

function startMcp(origin) {
  const child = spawn(process.execPath, [join(HERE, "index.mjs")], {
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      ...process.env,
      REDDIT_CLIENT_ID: "test-client",
      REDDIT_REFRESH_TOKEN: "refresh-token",
      REDDIT_API_BASE: origin,
      REDDIT_AUTH_BASE: origin,
      REDDIT_USER_AGENT: "test:threadscout-for-reddit:v0.2.0 (by /u/test_account)"
    }
  });
  let nextId = 1;
  let buffer = "";
  const pending = new Map();
  child.stdout.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    while (buffer.includes("\n")) {
      const index = buffer.indexOf("\n");
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      const message = JSON.parse(line);
      const waiter = pending.get(message.id);
      if (waiter) {
        pending.delete(message.id);
        waiter.resolve(message);
      }
    }
  });
  const send = (method, params = {}) => {
    const id = nextId++;
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${method}`)), 3000);
      pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); } });
    });
  };
  return { child, send };
}

test("MCP server exposes authenticated Reddit tools and enforces previews", async (t) => {
  const mock = await mockReddit();
  const mcp = startMcp(mock.origin);
  t.after(() => {
    mcp.child.kill();
    mock.server.close();
  });

  const initialized = await mcp.send("initialize", { protocolVersion: "2025-06-18" });
  assert.equal(initialized.result.serverInfo.name, "reddit-account");

  const listed = await mcp.send("tools/list");
  const names = listed.result.tools.map((tool) => tool.name);
  assert.ok(names.includes("reddit_get_me"));
  assert.ok(names.includes("reddit_submit_post"));
  assert.ok(names.includes("reddit_moderate"));
  assert.ok(!names.includes("reddit_vote"));
  assert.equal(names.length, 18);

  const me = await mcp.send("tools/call", { name: "reddit_get_me", arguments: {} });
  assert.equal(me.result.structuredContent.account.name, "test_account");

  const feed = await mcp.send("tools/call", { name: "reddit_list_feed", arguments: { feed: "subreddit", subreddit: "test", sort: "new" } });
  assert.equal(feed.result.structuredContent.items[0].title, "Hello");

  const preview = await mcp.send("tools/call", {
    name: "reddit_comment",
    arguments: { parent_fullname: "t3_post1", text: "A draft response" }
  });
  assert.equal(preview.result.structuredContent.dry_run, true);
  assert.equal(mock.requests.filter((request) => request.url.startsWith("/api/comment")).length, 0);

  for (const [name, args] of [
    ["reddit_submit_post", { subreddit: "test", title: "Draft", kind: "self", text: "Body" }],
    ["reddit_delete", { fullname: "t1_comment" }],
    ["reddit_send_message", { to: "recipient", subject: "Hello", text: "Draft message" }],
    ["reddit_moderate", { action: "remove", fullname: "t3_post1" }]
  ]) {
    const result = await mcp.send("tools/call", { name, arguments: args });
    assert.equal(result.result.structuredContent.dry_run, true, `${name} should preview by default`);
  }

  const rejected = await mcp.send("tools/call", {
    name: "reddit_comment",
    arguments: { parent_fullname: "t3_post1", text: "A response", dry_run: false }
  });
  assert.equal(rejected.result.isError, true);

  const executed = await mcp.send("tools/call", {
    name: "reddit_comment",
    arguments: { parent_fullname: "t3_post1", text: "A response", dry_run: false, confirmation: "confirmed" }
  });
  assert.equal(executed.result.isError, false);
  assert.equal(mock.requests.filter((request) => request.url.startsWith("/api/comment")).length, 1);

  const submitted = await mcp.send("tools/call", {
    name: "reddit_submit_post",
    arguments: {
      subreddit: "test",
      title: "Confirmed post",
      kind: "self",
      text: "Confirmed body",
      dry_run: false,
      confirmation: "confirmed"
    }
  });
  assert.equal(submitted.result.isError, false);
  const submitRequests = mock.requests.filter((request) => request.url.startsWith("/api/submit"));
  assert.equal(submitRequests.length, 1);
  assert.match(submitRequests[0].body, /sr=test/);
  assert.match(submitRequests[0].body, /title=Confirmed\+post/);
  assert.match(submitRequests[0].body, /text=Confirmed\+body/);
});
