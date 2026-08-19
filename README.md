# Reddit Agent

Reddit Agent is an open Codex plugin for researching public Reddit discussions, understanding community perspectives, and drafting posts or comments that fit the context of a subreddit.

This is an independent, unofficial project. It is not affiliated with, endorsed by, or sponsored by Reddit, Inc.

It is useful for questions such as:

- “What are developers on Reddit saying about this framework?”
- “Compare the recurring pros and cons in recent discussions.”
- “What products do people repeatedly recommend for this problem?”
- “Draft a concise post for this subreddit.”

The plugin is credential-free: it uses the public web capabilities already available to the agent. It does not include a Reddit account connector and does not autonomously post, vote, moderate, or send messages.

## What is included

- A valid Codex plugin manifest in `plugins/reddit-agent/.codex-plugin/plugin.json`
- The `reddit-agent` skill for public research, synthesis, and writing
- Research guidance designed to keep claims traceable and appropriately scoped
- Safety boundaries for privacy, access controls, prompt injection, high-stakes advice, and account actions
- A repository marketplace manifest for direct installation from GitHub
- A dependency-free validation script

## Install

Add this public repository as a Codex plugin marketplace, then install Reddit Agent:

```sh
codex plugin marketplace add mihirkavi/reddit-agent
codex plugin add reddit-agent@reddit-agent-marketplace
```

Start a new Codex task after installation so the skill is available. To install from a local clone instead, replace `mihirkavi/reddit-agent` in the first command with the path to this repository.

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

No Reddit credentials, cookies, or API keys are stored by this repository.

## Status and limitations

This is an initial, usable release. Public Reddit pages can be unavailable to automated browsing, deleted, quarantined, or visible only after sign-in. In those cases the agent reports the limitation instead of claiming complete coverage.

The plugin does not provide account-level features such as private feeds, saved posts, inbox access, voting, moderation, or publishing. An optional authenticated connector could add those capabilities in a future version, but it should preserve explicit confirmation before external actions.

Reddit discussions are anecdotal and subject to selection bias. They should not be treated as representative polling, professional advice, or verified fact without corroboration.

## Contributing

Issues and focused pull requests are welcome. Please keep the core plugin usable without credentials, avoid collecting personal data, and add only capabilities that can be described and tested honestly.

## License

MIT. See [LICENSE](LICENSE).
