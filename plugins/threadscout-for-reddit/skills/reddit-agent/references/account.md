# Authenticated Reddit account workflows

Use the `reddit-account` tools for account data and actions. Public-web research can still use web search when no account is connected.

## Authentication

1. Call `reddit_auth_status` before an account workflow.
2. If no client is configured, explain that Reddit currently requires explicit Data API approval. The user must use Reddit's current API request form when Devvit cannot support the use case. Ask only for an OAuth client ID Reddit has approved or issued; never ask for an account password, an app-account password, or a client secret. The registered redirect URI must match `http://127.0.0.1:8714/callback` unless the user configured another loopback URI.
3. Call `reddit_auth_start`, present its authorization link, and let the user sign in and approve scopes directly on Reddit.
4. After the browser flow, call `reddit_auth_status` and `reddit_get_me`. State the connected username so the user can verify the correct account.
5. Access tokens are short-lived and refreshed locally. Never display, copy, or inspect tokens. `reddit_auth_disconnect` removes the stored refresh token.

Reddit API approval is an external prerequisite. Creating a Devvit community app does not create the OAuth client this connector needs. Reddit may require a separate app account and prohibit mixed personal/automated use. Do not claim account access is available until Reddit approves the use case, provides a compatible OAuth client, and `reddit_get_me` succeeds.

## Read operations

Read-only account requests may run directly after authentication. Relevant tools cover identity, feeds, search, threads, user activity, saved/hidden/voted-history listings, subscriptions, inbox, and moderator queues. Return only the data needed for the request; avoid dumping entire histories or inboxes into chat.

## Action boundary

Mutation tools default to a dry-run preview.

- For public communication, deletion, reports, private messages, and moderation: run the preview, show the exact target and content/action, then wait for the user's explicit confirmation. Only then repeat with `dry_run=false` and `confirmation="confirmed"`.
- For reversible private organization actions such as save/unsave, hide/unhide, mark read/unread, or subscribe/unsubscribe: a user's explicit instruction naming the action and target is sufficient confirmation. Still call the tool with its required confirmation fields; if the request was ambiguous, preview first.
- Never treat approval of one action as approval for a batch, future action, revised text, different recipient, or different subreddit.
- If Reddit returns a rule, permission, rate-limit, CAPTCHA, or approval error, stop and report it. Do not retry around the restriction.

After execution, report the returned Reddit identifier or permalink when available. Never claim success from a preview.

## Supported boundary

The connector supports common Data API account workflows: reading feeds/account history, creating and editing text or link posts, commenting, deleting the user's content, saving/hiding, subscriptions, private messages, reports, and common moderation actions when the account has permission.

It intentionally does not expose voting, chat-room automation, awards/purchases, account security/settings changes, media upload, arbitrary raw API calls, or website-only features. Do not bypass these boundaries through browser automation. Reddit may restrict or change API availability, and all actions remain subject to Reddit approval, scopes, subreddit rules, account permissions, and platform policy.
