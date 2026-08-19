#!/usr/bin/env node
import readline from "node:readline";
import { RedditClient } from "./reddit-client.mjs";
import { callTool, toolDefinitions } from "./tools.mjs";

const client = new RedditClient();

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function result(id, value) {
  write({ jsonrpc: "2.0", id, result: value });
}

function error(id, code, message) {
  write({ jsonrpc: "2.0", id, error: { code, message } });
}

const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity, terminal: false });
input.on("line", async (line) => {
  if (!line.trim()) return;
  let request;
  try {
    request = JSON.parse(line);
  } catch {
    error(null, -32700, "Parse error");
    return;
  }

  if (request.id === undefined) return;
  try {
    switch (request.method) {
      case "initialize":
        result(request.id, {
          protocolVersion: request.params?.protocolVersion || "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "reddit-account", version: "0.2.0" }
        });
        break;
      case "ping":
        result(request.id, {});
        break;
      case "tools/list":
        result(request.id, { tools: toolDefinitions });
        break;
      case "tools/call": {
        const output = await callTool(client, request.params?.name, request.params?.arguments || {});
        result(request.id, {
          content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
          isError: false
        });
        break;
      }
      default:
        error(request.id, -32601, `Method not found: ${request.method}`);
    }
  } catch (caught) {
    result(request.id, {
      content: [{ type: "text", text: caught.message }],
      isError: true
    });
  }
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
