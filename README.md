# ThreadScout for Reddit

ThreadScout for Reddit is an open Codex plugin for researching public Reddit discussions and, when connected through approved Reddit OAuth access, safely working with an authorized account.

This is an independent, unofficial project. It is not affiliated with, endorsed by, or sponsored by Reddit, Inc.

It is useful for questions such as:

- “What are developers on Reddit saying about this framework?”
- “Compare the recurring pros and cons in recent discussions.”
- “What products do people repeatedly recommend for this problem?”
- “Draft a concise post for this subreddit.”

Public research remains credential-free. Account access uses a bundled local connector: you approve scopes on Reddit, the plugin never sees your password, and the project owner never receives your token.

## What is included

- A valid Codex plugin manifest in `plugins/threadscout-for-reddit/.codex-plugin/plugin.json`
- The `reddit-agent` skill for public research, synthesis, and writing
- A dependency-free local MCP connector for Reddit OAuth and account tools
- Research guidance designed to keep claims traceable and appropriately scoped
- Safety boundaries for privacy, access controls, prompt injection, high-stakes advice, and account actions
- Preview and confirmation gates for posts, comments, messages, deletion, reports, and moderation
- A repository marketplace manifest for direct installation from GitHub
- A dependency-free validation script

## Install

Add this public repository as a Codex plugin marketplace, then install ThreadScout for Reddit:

```sh
codex plugin marketplace add mihirkavi/reddit-agent
codex plugin add threadscout-for-reddit@threadscout-marketplace
```

Start a new Codex task after installation so the skill is available. To install from a local clone instead, replace `mihirkavi/reddit-agent` in the first command with the path to this repository.

Node.js 20 or newer is required for the bundled local account connector. Public research still works without it.

## Connect your Reddit account

Reddit currently requires explicit approval before an app can access the Data API. Start with Reddit's [Responsible Builder Policy](https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy), then use its linked API request form if Devvit cannot support the use case. Creating a Devvit community app does not create the OAuth client this connector needs.

In the request, explain that this is an open-source, local, user-directed assistant; it needs private account data and cross-community account actions that Devvit does not expose; it never automates voting; and public or destructive actions require confirmation. Ask Reddit to approve OAuth access with this redirect URI:

```text
http://127.0.0.1:8714/callback
```

Then start a new Codex task and say:

```text
Use $reddit-agent to connect my Reddit account. My approved Reddit client ID is <client-id>.
```

Codex will return a Reddit authorization link. Sign in and approve on Reddit itself; do not paste your Reddit password, an automated-account password, or OAuth tokens into chat. The connector stores the refresh token locally—in macOS Keychain on macOS, or a user-only configuration file on other systems—and refreshes short-lived access tokens automatically.

Useful authenticated prompts include:

```text
Use $reddit-agent to show my unread Reddit inbox.
```

```text
Use $reddit-agent to show me a preview of a post for r/<community>, then wait for confirmation before publishing.
```

```text
Use $reddit-agent to review my moderation queue and suggest actions without taking them.
```

For development, validate it first:

```sh
python3 scripts/check.py
```

Once installed, start with one of these prompts:

```text
Use $reddit-agent to find recent Reddit discussions about local-first software.
```

```text
Use $reddit-agent to summarize the strongest arguments for and against this product category.
```

```text
Use $reddit-agent to draft a post asking r/<community> for practical advice about <topic>.
```

## How it works

The agent selects a research, synthesis, or writing workflow. Research favors original Reddit permalinks, recent and diverse discussions, and explicit caveats about sampling. Writing checks community context when possible and creates a draft without treating that as permission to publish.

No Reddit credentials, cookies, or API keys are stored in this repository. See [PRIVACY.md](PRIVACY.md) for local token handling.

## Status and limitations

Public Reddit pages can be unavailable to automated browsing, deleted, quarantined, or visible only after sign-in. In those cases the agent reports the limitation instead of claiming complete coverage.

The account connector supports identity, feeds, search, saved/hidden/history listings, subscriptions, inbox and private messages, text/link posts, comments, editing, deleting, reporting, and common moderator actions where the connected account has permission. Reddit approval, OAuth scopes, subreddit rules, rate limits, and account permissions still apply.

Voting is intentionally not exposed because Reddit's current Responsible Builder Policy prohibits apps from manipulating voting or karma. Website-only capabilities such as chat-room automation, awards/purchases, account security changes, and media upload are not included. The connector does not provide arbitrary API pass-through or browser-based workarounds.

Reddit discussions are anecdotal and subject to selection bias. They should not be treated as representative polling, professional advice, or verified fact without corroboration.

## Contributing

Issues and focused pull requests are welcome. Please keep the core plugin usable without credentials, avoid collecting personal data, and add only capabilities that can be described and tested honestly.

## License

MIT. See [LICENSE](LICENSE).
