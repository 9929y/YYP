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

Prove behavior with `npm test`, `curl`, and the **preview link** — not with media.

Production remains Vercel (`yaniceyang.com`). The tunnel is the working preview for in-progress work.
