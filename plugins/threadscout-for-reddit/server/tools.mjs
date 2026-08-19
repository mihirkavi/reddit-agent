const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true };
const mutating = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true };

const objectSchema = (properties, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false
});

const dryRunFields = {
  dry_run: { type: "boolean", description: "Defaults to true. Set false only after showing the preview and receiving explicit user confirmation." },
  confirmation: { type: "string", enum: ["confirmed"], description: "Required with dry_run=false." }
};

export const toolDefinitions = [
  {
    name: "reddit_auth_status",
    description: "Check whether a Reddit OAuth client and user account are connected. Also returns the result of a pending browser authorization.",
    inputSchema: objectSchema({}),
    annotations: readOnly
  },
  {
    name: "reddit_auth_start",
    description: "Start Reddit OAuth in the user's browser using an approved Reddit app client ID. Returns a local authorization URL; never accepts a Reddit password.",
    inputSchema: objectSchema({
      client_id: { type: "string", description: "Approved Reddit installed/web app client ID. May be omitted if already configured." },
      redirect_uri: { type: "string", description: "Registered loopback callback. Defaults to http://127.0.0.1:8714/callback." },
      scopes: { type: "array", items: { type: "string" }, description: "Optional least-privilege scopes. vote and wildcard scopes are rejected." }
    }),
    annotations: mutating
  },
  {
    name: "reddit_auth_disconnect",
    description: "Remove the stored Reddit refresh token from this machine. Requires confirmation=confirmed.",
    inputSchema: objectSchema({ confirmation: { type: "string", enum: ["confirmed"] } }, ["confirmation"]),
    annotations: mutating
  },
  {
    name: "reddit_get_me",
    description: "Get the connected Reddit account identity and account metadata.",
    inputSchema: objectSchema({}),
    annotations: readOnly
  },
  {
    name: "reddit_list_feed",
    description: "Read home, popular, all, or a subreddit feed with hot/new/top/rising/controversial sorting.",
    inputSchema: objectSchema({
      feed: { type: "string", enum: ["home", "popular", "all", "subreddit"] },
      subreddit: { type: "string" },
      sort: { type: "string", enum: ["hot", "new", "top", "rising", "controversial"], default: "hot" },
      time: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], default: "all" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      after: { type: "string" }
    }, ["feed"]),
    annotations: readOnly
  },
  {
    name: "reddit_search",
    description: "Search Reddit globally or within one subreddit using the connected account.",
    inputSchema: objectSchema({
      query: { type: "string" },
      subreddit: { type: "string" },
      sort: { type: "string", enum: ["relevance", "hot", "top", "new", "comments"], default: "relevance" },
      time: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], default: "all" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      after: { type: "string" }
    }, ["query"]),
    annotations: readOnly
  },
  {
    name: "reddit_get_post",
    description: "Get a Reddit post and its comments by post ID or permalink.",
    inputSchema: objectSchema({
      post: { type: "string", description: "Post ID, t3 fullname, or reddit.com permalink." },
      comment_sort: { type: "string", enum: ["confidence", "top", "new", "controversial", "old", "qa"], default: "confidence" },
      limit: { type: "integer", minimum: 1, maximum: 500, default: 100 }
    }, ["post"]),
    annotations: readOnly
  },
  {
    name: "reddit_get_user_activity",
    description: "Read a user's public activity or the connected user's private saved, hidden, upvoted, and downvoted listings when authorized.",
    inputSchema: objectSchema({
      username: { type: "string", description: "Defaults to the connected user." },
      kind: { type: "string", enum: ["overview", "submitted", "comments", "saved", "hidden", "upvoted", "downvoted"] },
      sort: { type: "string", enum: ["hot", "new", "top", "controversial"], default: "new" },
      time: { type: "string", enum: ["hour", "day", "week", "month", "year", "all"], default: "all" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      after: { type: "string" }
    }, ["kind"]),
    annotations: readOnly
  },
  {
    name: "reddit_list_subscriptions",
    description: "List subreddits the connected account subscribes to.",
    inputSchema: objectSchema({ limit: { type: "integer", minimum: 1, maximum: 100, default: 100 }, after: { type: "string" } }),
    annotations: readOnly
  },
  {
    name: "reddit_get_inbox",
    description: "Read the connected account's inbox, unread items, messages, comment replies, self replies, or mentions.",
    inputSchema: objectSchema({
      where: { type: "string", enum: ["inbox", "unread", "messages", "comments", "selfreply", "mentions", "sent"], default: "inbox" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      after: { type: "string" }
    }),
    annotations: readOnly
  },
  {
    name: "reddit_get_mod_queue",
    description: "Read a moderation queue for a subreddit where the connected account is a moderator.",
    inputSchema: objectSchema({
      subreddit: { type: "string" },
      queue: { type: "string", enum: ["modqueue", "reports", "spam", "unmoderated", "edited", "log"], default: "modqueue" },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
      after: { type: "string" }
    }, ["subreddit"]),
    annotations: readOnly
  },
  {
    name: "reddit_submit_post",
    description: "Preview or submit a text/link post. Execution requires dry_run=false and confirmation=confirmed after the user approves the exact title/body/destination.",
    inputSchema: objectSchema({
      subreddit: { type: "string" },
      title: { type: "string", maxLength: 300 },
      kind: { type: "string", enum: ["self", "link"] },
      text: { type: "string" },
      url: { type: "string" },
      nsfw: { type: "boolean", default: false },
      spoiler: { type: "boolean", default: false },
      send_replies: { type: "boolean", default: true },
      flair_id: { type: "string" },
      flair_text: { type: "string" },
      ...dryRunFields
    }, ["subreddit", "title", "kind"]),
    annotations: mutating
  },
  {
    name: "reddit_comment",
    description: "Preview or publish a comment/reply. Execution requires explicit confirmation of the exact text and parent.",
    inputSchema: objectSchema({ parent_fullname: { type: "string" }, text: { type: "string" }, ...dryRunFields }, ["parent_fullname", "text"]),
    annotations: mutating
  },
  {
    name: "reddit_edit",
    description: "Preview or edit one of the connected user's posts/comments. Execution requires explicit confirmation.",
    inputSchema: objectSchema({ fullname: { type: "string" }, text: { type: "string" }, ...dryRunFields }, ["fullname", "text"]),
    annotations: mutating
  },
  {
    name: "reddit_delete",
    description: "Preview or permanently delete one of the connected user's posts/comments. Execution requires explicit confirmation.",
    inputSchema: objectSchema({ fullname: { type: "string" }, ...dryRunFields }, ["fullname"]),
    annotations: mutating
  },
  {
    name: "reddit_account_action",
    description: "Preview or perform a reversible account action: save, unsave, hide, unhide, subscribe, unsubscribe, mark_read, mark_unread, or report. Reddit voting is not supported.",
    inputSchema: objectSchema({
      action: { type: "string", enum: ["save", "unsave", "hide", "unhide", "subscribe", "unsubscribe", "mark_read", "mark_unread", "report"] },
      fullname: { type: "string", description: "Required for item actions." },
      subreddit: { type: "string", description: "Required for subscribe/unsubscribe." },
      reason: { type: "string", description: "Required for report." },
      ...dryRunFields
    }, ["action"]),
    annotations: mutating
  },
  {
    name: "reddit_send_message",
    description: "Preview or send a Reddit private message/modmail. Execution requires explicit consent and confirmation of recipient, subject, and body.",
    inputSchema: objectSchema({
      to: { type: "string" },
      subject: { type: "string", maxLength: 100 },
      text: { type: "string" },
      from_subreddit: { type: "string", description: "Optional subreddit for authorized modmail." },
      ...dryRunFields
    }, ["to", "subject", "text"]),
    annotations: mutating
  },
  {
    name: "reddit_moderate",
    description: "Preview or perform a supported moderation action in a subreddit where the connected account has permission.",
    inputSchema: objectSchema({
      action: { type: "string", enum: ["approve", "remove", "spam", "lock", "unlock", "mark_nsfw", "unmark_nsfw", "spoiler", "unspoiler", "distinguish", "undistinguish", "sticky", "unsticky"] },
      fullname: { type: "string" },
      sticky_slot: { type: "integer", enum: [1, 2] },
      ...dryRunFields
    }, ["action", "fullname"]),
    annotations: mutating
  }
];

function assertExecuteAllowed(args) {
  if (args.dry_run !== false) return false;
  if (args.confirmation !== "confirmed") {
    throw new Error("Execution requires confirmation=confirmed after the user approves the exact preview.");
  }
  return true;
}

function preview(tool, args) {
  const { confirmation, ...details } = args;
  return {
    dry_run: true,
    tool,
    details: { ...details, dry_run: false },
    confirmation_required: "Show this exact action to the user. Execute only after explicit confirmation."
  };
}

function cleanSubreddit(value) {
  if (!value) throw new Error("A subreddit is required.");
  const cleaned = value.replace(/^r\//i, "");
  if (!/^[A-Za-z0-9_]{2,21}$/.test(cleaned)) throw new Error("Invalid subreddit name.");
  return cleaned;
}

function cleanFullname(value, prefixes = ["t1_", "t3_"]) {
  if (!prefixes.some((prefix) => value?.startsWith(prefix))) throw new Error(`Expected a Reddit fullname beginning with ${prefixes.join(" or ")}.`);
  return value;
}

function listing(result) {
  const children = result.data?.data?.children || [];
  return {
    items: children.map(({ kind, data }) => ({ kind, ...data })),
    after: result.data?.data?.after || null,
    before: result.data?.data?.before || null,
    rate_limit: result.rate_limit
  };
}

export async function callTool(client, name, args = {}) {
  switch (name) {
    case "reddit_auth_status": {
      const status = await client.authStatus();
      if (client.pendingAuth?.result) status.last_authorization = client.pendingAuth.result;
      return status;
    }
    case "reddit_auth_start":
      return client.startAuth(args);
    case "reddit_auth_disconnect":
      if (args.confirmation !== "confirmed") throw new Error("Disconnect requires confirmation=confirmed.");
      return client.disconnect();
    case "reddit_get_me": {
      const result = await client.api("/api/v1/me");
      return { account: result.data.data, rate_limit: result.rate_limit };
    }
    case "reddit_list_feed": {
      const sort = args.sort || "hot";
      let path;
      if (args.feed === "home") path = `/${sort}`;
      else if (args.feed === "popular") path = `/r/popular/${sort}`;
      else if (args.feed === "all") path = `/r/all/${sort}`;
      else path = `/r/${cleanSubreddit(args.subreddit)}/${sort}`;
      return listing(await client.api(path, { query: { t: args.time || "all", limit: args.limit || 25, after: args.after } }));
    }
    case "reddit_search": {
      const path = args.subreddit ? `/r/${cleanSubreddit(args.subreddit)}/search` : "/search";
      return listing(await client.api(path, { query: {
        q: args.query,
        restrict_sr: args.subreddit ? "on" : undefined,
        sort: args.sort || "relevance",
        t: args.time || "all",
        limit: args.limit || 25,
        after: args.after,
        type: "link"
      } }));
    }
    case "reddit_get_post": {
      let id = args.post;
      if (/^https?:\/\//.test(id)) {
        const match = new URL(id).pathname.match(/\/comments\/([A-Za-z0-9]+)/);
        if (!match) throw new Error("The URL is not a Reddit post permalink.");
        id = match[1];
      }
      id = id.replace(/^t3_/, "");
      if (!/^[A-Za-z0-9]+$/.test(id)) throw new Error("Invalid Reddit post ID.");
      const result = await client.api(`/comments/${id}`, { query: { sort: args.comment_sort || "confidence", limit: args.limit || 100 } });
      return { thread: result.data, rate_limit: result.rate_limit };
    }
    case "reddit_get_user_activity": {
      const config = await client.config();
      const username = args.username || config.username;
      if (!username) throw new Error("Provide a username or connect Reddit first.");
      if (!/^[A-Za-z0-9_-]{3,20}$/.test(username)) throw new Error("Invalid Reddit username.");
      return listing(await client.api(`/user/${encodeURIComponent(username)}/${args.kind}`, { query: {
        sort: args.sort || "new", t: args.time || "all", limit: args.limit || 25, after: args.after
      } }));
    }
    case "reddit_list_subscriptions":
      return listing(await client.api("/subreddits/mine/subscriber", { query: { limit: args.limit || 100, after: args.after } }));
    case "reddit_get_inbox":
      return listing(await client.api(`/message/${args.where || "inbox"}`, { query: { limit: args.limit || 25, after: args.after } }));
    case "reddit_get_mod_queue":
      return listing(await client.api(`/r/${cleanSubreddit(args.subreddit)}/about/${args.queue || "modqueue"}`, { query: { limit: args.limit || 25, after: args.after } }));
    case "reddit_submit_post": {
      if (!assertExecuteAllowed(args)) return preview(name, args);
      if (args.kind === "self" && args.url) throw new Error("A self post cannot include url.");
      if (args.kind === "link" && !args.url) throw new Error("A link post requires url.");
      return client.api("/api/submit", { method: "POST", form: {
        api_type: "json", sr: cleanSubreddit(args.subreddit), title: args.title, kind: args.kind,
        text: args.kind === "self" ? args.text || "" : undefined,
        url: args.kind === "link" ? args.url : undefined,
        nsfw: Boolean(args.nsfw), spoiler: Boolean(args.spoiler), sendreplies: args.send_replies !== false,
        flair_id: args.flair_id, flair_text: args.flair_text, resubmit: true
      } });
    }
    case "reddit_comment":
      if (!assertExecuteAllowed(args)) return preview(name, args);
      return client.api("/api/comment", { method: "POST", form: { api_type: "json", thing_id: cleanFullname(args.parent_fullname), text: args.text } });
    case "reddit_edit":
      if (!assertExecuteAllowed(args)) return preview(name, args);
      return client.api("/api/editusertext", { method: "POST", form: { api_type: "json", thing_id: cleanFullname(args.fullname), text: args.text } });
    case "reddit_delete":
      if (!assertExecuteAllowed(args)) return preview(name, args);
      return client.api("/api/del", { method: "POST", form: { id: cleanFullname(args.fullname) } });
    case "reddit_account_action": {
      if (!assertExecuteAllowed(args)) return preview(name, args);
      const itemActions = new Set(["save", "unsave", "hide", "unhide", "mark_read", "mark_unread", "report"]);
      if (itemActions.has(args.action)) cleanFullname(args.fullname, ["t1_", "t3_", "t4_"]);
      if (["subscribe", "unsubscribe"].includes(args.action)) {
        return client.api("/api/subscribe", { method: "POST", form: { action: args.action === "subscribe" ? "sub" : "unsub", sr_name: cleanSubreddit(args.subreddit) } });
      }
      if (args.action === "report") {
        if (!args.reason) throw new Error("A report reason is required.");
        return client.api("/api/report", { method: "POST", form: { thing_id: args.fullname, reason: args.reason } });
      }
      const endpoint = { mark_read: "read_message", mark_unread: "unread_message" }[args.action] || args.action;
      const key = args.action.startsWith("mark_") ? "id" : "id";
      return client.api(`/api/${endpoint}`, { method: "POST", form: { [key]: args.fullname } });
    }
    case "reddit_send_message":
      if (!assertExecuteAllowed(args)) return preview(name, args);
      return client.api("/api/compose", { method: "POST", form: {
        api_type: "json", to: args.to, subject: args.subject, text: args.text, from_sr: args.from_subreddit ? cleanSubreddit(args.from_subreddit) : undefined
      } });
    case "reddit_moderate": {
      if (!assertExecuteAllowed(args)) return preview(name, args);
      const id = cleanFullname(args.fullname);
      const endpoint = {
        mark_nsfw: "marknsfw", unmark_nsfw: "unmarknsfw", unspoiler: "unspoiler",
        approve: "approve", lock: "lock", unlock: "unlock", spoiler: "spoiler"
      }[args.action];
      if (endpoint) return client.api(`/api/${endpoint}`, { method: "POST", form: { id } });
      if (["remove", "spam"].includes(args.action)) {
        return client.api("/api/remove", { method: "POST", form: { id, spam: args.action === "spam" } });
      }
      if (["distinguish", "undistinguish"].includes(args.action)) {
        return client.api("/api/distinguish", { method: "POST", form: { api_type: "json", id, how: args.action === "distinguish" ? "yes" : "no" } });
      }
      return client.api("/api/set_subreddit_sticky", { method: "POST", form: {
        api_type: "json", id, state: args.action === "sticky", num: args.sticky_slot || 1
      } });
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
