import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { randomBytes, timingSafeEqual } from "node:crypto";

const execFileAsync = promisify(execFile);
const CONFIG_PATH = join(homedir(), ".config", "threadscout-for-reddit", "config.json");
const TOKEN_PATH = join(homedir(), ".config", "threadscout-for-reddit", "refresh-token");
const KEYCHAIN_SERVICE = "com.mihirkavi.threadscout-for-reddit";
const DEFAULT_REDIRECT = "http://127.0.0.1:8714/callback";
const DEFAULT_SCOPES = [
  "identity",
  "read",
  "history",
  "mysubreddits",
  "save",
  "subscribe",
  "submit",
  "edit",
  "privatemessages",
  "report",
  "flair",
  "modconfig",
  "modcontributors",
  "modflair",
  "modlog",
  "modmail",
  "modothers",
  "modposts",
  "modself",
  "modwiki",
  "structuredstyles",
  "wikiedit",
  "wikiread"
];

function constantTimeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function htmlPage(title, message) {
  const safeTitle = String(title).replace(/[<>&"]/g, "");
  const safeMessage = String(message).replace(/[<>&"]/g, "");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body><h1>${safeTitle}</h1><p>${safeMessage}</p><p>You can close this tab and return to Codex.</p></body></html>`;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function writePrivate(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeFile(path, value, { encoding: "utf8", mode: 0o600 });
}

function summarizeRateLimit(headers) {
  const used = headers.get("x-ratelimit-used");
  const remaining = headers.get("x-ratelimit-remaining");
  const resetSeconds = headers.get("x-ratelimit-reset");
  return used || remaining || resetSeconds
    ? { used, remaining, reset_seconds: resetSeconds }
    : undefined;
}

export class RedditClient {
  constructor({ fetchImpl = fetch } = {}) {
    this.fetch = fetchImpl;
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    this.sessionRefreshToken = null;
    this.pendingAuth = null;
  }

  async config() {
    const stored = await readJson(CONFIG_PATH);
    return {
      clientId: process.env.REDDIT_CLIENT_ID || stored.client_id || null,
      clientSecret: process.env.REDDIT_CLIENT_SECRET || "",
      redirectUri: process.env.REDDIT_REDIRECT_URI || stored.redirect_uri || DEFAULT_REDIRECT,
      scopes: stored.scopes || DEFAULT_SCOPES,
      username: stored.username || null,
      userAgent:
        process.env.REDDIT_USER_AGENT ||
        `desktop:com.mihirkavi.threadscout-for-reddit:v0.2.0${stored.username ? ` (by /u/${stored.username})` : ""}`,
      apiBase: (process.env.REDDIT_API_BASE || "https://oauth.reddit.com").replace(/\/$/, ""),
      authBase: (process.env.REDDIT_AUTH_BASE || "https://www.reddit.com").replace(/\/$/, "")
    };
  }

  async saveConfig(next) {
    const current = await readJson(CONFIG_PATH);
    await writePrivate(CONFIG_PATH, `${JSON.stringify({ ...current, ...next }, null, 2)}\n`);
  }

  async readRefreshToken(clientId) {
    if (process.env.REDDIT_REFRESH_TOKEN) return process.env.REDDIT_REFRESH_TOKEN;
    if (this.sessionRefreshToken) return this.sessionRefreshToken;

    if (platform() === "darwin") {
      try {
        const { stdout } = await execFileAsync("/usr/bin/security", [
          "find-generic-password",
          "-a",
          clientId,
          "-s",
          KEYCHAIN_SERVICE,
          "-w"
        ]);
        return stdout.trim() || null;
      } catch {
        return null;
      }
    }

    try {
      return (await readFile(TOKEN_PATH, "utf8")).trim() || null;
    } catch (error) {
      if (error.code === "ENOENT") return null;
      throw error;
    }
  }

  async storeRefreshToken(clientId, refreshToken) {
    this.sessionRefreshToken = refreshToken;
    if (platform() === "darwin") {
      await execFileAsync("/usr/bin/security", [
        "add-generic-password",
        "-a",
        clientId,
        "-s",
        KEYCHAIN_SERVICE,
        "-w",
        refreshToken,
        "-U"
      ]);
      return "macOS Keychain";
    }

    await writePrivate(TOKEN_PATH, `${refreshToken}\n`);
    return TOKEN_PATH;
  }

  async deleteRefreshToken(clientId) {
    this.sessionRefreshToken = null;
    this.accessToken = null;
    this.accessTokenExpiresAt = 0;
    if (platform() === "darwin") {
      try {
        await execFileAsync("/usr/bin/security", [
          "delete-generic-password",
          "-a",
          clientId,
          "-s",
          KEYCHAIN_SERVICE
        ]);
      } catch {
        // Already absent.
      }
    } else {
      try {
        await unlink(TOKEN_PATH);
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }

  async authStatus() {
    const config = await this.config();
    const refreshToken = config.clientId ? await this.readRefreshToken(config.clientId) : null;
    return {
      client_configured: Boolean(config.clientId),
      authenticated: Boolean(refreshToken),
      username: config.username,
      scopes: config.scopes,
      redirect_uri: config.redirectUri,
      token_storage:
        process.env.REDDIT_REFRESH_TOKEN
          ? "REDDIT_REFRESH_TOKEN environment variable"
          : platform() === "darwin"
            ? "macOS Keychain"
            : TOKEN_PATH,
      policy_note: "Reddit API access requires Reddit approval. Voting automation is intentionally unavailable."
    };
  }

  async startAuth({ client_id, redirect_uri, scopes } = {}) {
    if (this.pendingAuth) throw new Error("A Reddit authorization is already pending.");
    const current = await this.config();
    const clientId = client_id || current.clientId;
    if (!clientId || !/^[A-Za-z0-9_-]{5,80}$/.test(clientId)) {
      throw new Error("Provide the client ID for an approved Reddit installed or web app.");
    }

    const redirectUri = new URL(redirect_uri || current.redirectUri || DEFAULT_REDIRECT);
    if (redirectUri.protocol !== "http:" || !["127.0.0.1", "localhost", "[::1]"].includes(redirectUri.hostname)) {
      throw new Error("The bundled local connector only accepts a loopback HTTP redirect URI.");
    }
    const selectedScopes = Array.isArray(scopes) && scopes.length ? [...new Set(scopes)] : DEFAULT_SCOPES;
    if (selectedScopes.includes("vote") || selectedScopes.includes("*")) {
      throw new Error("The vote and wildcard scopes are not supported by ThreadScout for Reddit.");
    }

    const state = randomBytes(32).toString("hex");
    const authorizeUrl = new URL("/api/v1/authorize", current.authBase);
    authorizeUrl.search = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      state,
      redirect_uri: redirectUri.toString(),
      duration: "permanent",
      scope: selectedScopes.join(" ")
    }).toString();

    const server = createServer(async (request, response) => {
      try {
        const callback = new URL(request.url, redirectUri.origin);
        if (callback.pathname !== redirectUri.pathname) {
          response.writeHead(404).end("Not found");
          return;
        }
        if (!constantTimeEqual(callback.searchParams.get("state") || "", state)) {
          response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
          response.end(htmlPage("Authorization failed", "The OAuth state did not match."));
          return;
        }
        if (callback.searchParams.get("error")) {
          throw new Error(`Reddit authorization was declined: ${callback.searchParams.get("error")}`);
        }
        const code = callback.searchParams.get("code");
        if (!code) throw new Error("Reddit did not return an authorization code.");

        const token = await this.exchangeAuthorizationCode({
          clientId,
          clientSecret: current.clientSecret,
          redirectUri: redirectUri.toString(),
          code,
          userAgent: current.userAgent,
          authBase: current.authBase
        });
        if (!token.refresh_token) {
          throw new Error("Reddit did not return a refresh token. Ensure duration=permanent is permitted.");
        }
        const storage = await this.storeRefreshToken(clientId, token.refresh_token);
        this.accessToken = token.access_token;
        this.accessTokenExpiresAt = Date.now() + Math.max(30, token.expires_in - 30) * 1000;
        await this.saveConfig({
          client_id: clientId,
          redirect_uri: redirectUri.toString(),
          scopes: selectedScopes
        });
        const me = await this.api("/api/v1/me");
        const username = me.data?.data?.name;
        if (!username) throw new Error("Reddit authorized the app but did not return an account identity.");
        await this.saveConfig({ username });
        this.pendingAuth.result = { ok: true, username, token_storage: storage };
        response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        response.end(htmlPage("Reddit connected", `Connected as u/${username}.`));
      } catch (error) {
        this.pendingAuth.result = { ok: false, error: error.message };
        response.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        response.end(htmlPage("Authorization failed", error.message));
      } finally {
        setTimeout(() => server.close(), 250);
      }
    });

    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(Number(redirectUri.port || 80), redirectUri.hostname.replace(/^\[|\]$/g, ""), resolve);
    });
    server.unref();
    this.pendingAuth = { state, server, result: null, createdAt: Date.now() };
    await this.saveConfig({
      client_id: clientId,
      redirect_uri: redirectUri.toString(),
      scopes: selectedScopes
    });

    return {
      authorization_url: authorizeUrl.toString(),
      redirect_uri: redirectUri.toString(),
      scopes: selectedScopes,
      next_step: "Open authorization_url, approve on Reddit, then call reddit_auth_status."
    };
  }

  async exchangeAuthorizationCode({ clientId, clientSecret, redirectUri, code, userAgent, authBase }) {
    const response = await this.fetch(`${authBase}/api/v1/access_token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret || ""}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": userAgent
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(`Reddit token exchange failed: ${data.error || response.status}`);
    return data;
  }

  async disconnect() {
    const config = await this.config();
    if (this.pendingAuth?.server) this.pendingAuth.server.close();
    this.pendingAuth = null;
    if (config.clientId) await this.deleteRefreshToken(config.clientId);
    await this.saveConfig({ username: null });
    return { disconnected: true };
  }

  async ensureAccessToken() {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) return this.accessToken;
    const config = await this.config();
    if (!config.clientId) throw new Error("Reddit is not configured. Run reddit_auth_start first.");
    const refreshToken = await this.readRefreshToken(config.clientId);
    if (!refreshToken) throw new Error("Reddit is not connected. Run reddit_auth_start and approve access.");
    const response = await this.fetch(`${config.authBase}/api/v1/access_token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret || ""}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
        "user-agent": config.userAgent
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken })
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(`Reddit token refresh failed: ${data.error || response.status}`);
    this.accessToken = data.access_token;
    this.accessTokenExpiresAt = Date.now() + Math.max(30, data.expires_in - 30) * 1000;
    return this.accessToken;
  }

  async api(path, { method = "GET", query, form, json } = {}) {
    const config = await this.config();
    const token = await this.ensureAccessToken();
    const url = new URL(path, `${config.apiBase}/`);
    url.searchParams.set("raw_json", "1");
    for (const [key, value] of Object.entries(query || {})) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const headers = {
      authorization: `Bearer ${token}`,
      "user-agent": config.userAgent
    };
    let body;
    if (form) {
      headers["content-type"] = "application/x-www-form-urlencoded";
      body = new URLSearchParams(
        Object.entries(form)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      );
    } else if (json) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(json);
    }
    const response = await this.fetch(url, { method, headers, body });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { text };
    }
    const redditErrors = data?.json?.errors;
    if (!response.ok || (Array.isArray(redditErrors) && redditErrors.length)) {
      const detail = Array.isArray(redditErrors) && redditErrors.length ? JSON.stringify(redditErrors) : text.slice(0, 500);
      throw new Error(`Reddit API ${method} ${path} failed (${response.status}): ${detail}`);
    }
    const rate_limit = summarizeRateLimit(response.headers);
    return rate_limit ? { data, rate_limit } : { data };
  }
}

export { DEFAULT_SCOPES };
