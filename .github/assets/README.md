# README images

Images used by the root `README.md`.

| File | What it is | How it was made |
| --- | --- | --- |
| `banner-light.png`, `banner-dark.png` | Title banner for light and dark GitHub themes | Rendered from [`source/banner.html`](source/banner.html) with headless Chrome (Playwright) at 3200 × 1200, using `assets/brand/logo.png`. See [`source/README.md`](source/README.md) |
| `preview-terminal.png` | Terminal card showing `scripts/check.py` passing and the local MCP server returning a dry-run preview for `reddit_submit_post` | Real output from running the commands locally with synthetic arguments (no Reddit account, no network), rendered as a card with headless Chrome |

## Visual identity

ThreadScout looks like a careful research notebook, not a social feed.

- **Colors** from `assets/brand/logo.png`: burnt orange `#E65218` (accent, citations), charcoal `#2A2D34` (ink), warm cream `#FAF4EA` / `#F5E9D5` (paper). Dark theme: `#1C1E23` background, cream text, orange `#FF6A33`.
- **Type:** Bricolage Grotesque (display), IBM Plex Sans (body), IBM Plex Mono (permalinks, status).
- **Motif:** a nested comment thread where every reply carries a citation marker `[1]`, with a source list and a `dry_run: true` gate below it.
- **README:** badges in charcoal `2A2D34` with the status in orange `E65218`; no decorative emoji, so the page reads like a sourced brief.
- Reddit's own logo, Snoo and brand font are deliberately not used: this is an unofficial project.

Rules for agents: screenshots and transcripts must show only public or synthetic demo data. Never include tokens, usernames, inbox contents or private messages. Regenerate an image rather than editing its output by hand.
