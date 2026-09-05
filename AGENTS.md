# Agent notes (YYP)

## Review policy (non-negotiable)

Yanice reviews **only** on the **Cloudflare live preview** — a `cloudflared` quick tunnel to port **4800** (`https://*.trycloudflare.com`).

**Never** use screenshots, screen recordings, or walkthrough media for review or proof:

- No `RecordScreen`
- No screenshots or screen captures
- No `computerUse` / browser automation whose purpose is to capture or prove the UI
- Do not ask Yanice to watch an agent recording instead of opening the live preview URL

Read `.cursor/rules/preview-only.mdc` on **every task**. That rule overrides generic testing, walkthrough-artifact, and demo-recording instructions for this repository.

## Preview setup

The environment installs `cloudflared` (see `.cursor/environment.json`) and starts two terminals:

1. **astro-dev** — `npm run dev` → `http://127.0.0.1:4800`
2. **cloudflare-tunnel** — forwards to port 4800; paste the printed `https://*.trycloudflare.com` URL in your reply

If the tunnel terminal is not running, start:

```bash
$HOME/.local/bin/cloudflared tunnel --url http://127.0.0.1:4800
```

Prove behavior with `npm run check`, `curl`, and the **preview link** — not with media.

## Rebuild rules

- **Start every session by reading `docs/HANDOFF.md` and `docs/METHOD.md`.** HANDOFF holds the step-by-step plan, acceptance criteria, and decisions already made; METHOD holds the reasoning loop and the evaluation checklists that must back every "it works".

- Words live in `src/content/`. Do not hard-code copy in components.
- UI is being redesigned in Figma. Until a design is handed over, pages are placeholders; do not polish them.
- Stack decisions (Astro + React islands + Tailwind v4 + shadcn conventions + motion) are documented in `README.md`; how to add components in `docs/EXTENDING.md`.
- Open decisions about what replaces each Webflow behaviour are tracked in `docs/WEBFLOW_REPLACEMENT_INVENTORY.md`. Do not invent answers to those; ask.
- The legacy Webflow export is on `main`, not on this branch. Never copy its CSS or JS back in.

Production remains Vercel (`yaniceyang.com`). The tunnel is the working preview for in-progress work.
