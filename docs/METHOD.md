# Method: how to think, evaluate, and decide on this project

Companion to `docs/HANDOFF.md`. That file says *what* to do next; this one
says *how to reason* while doing it, using the actual decisions from phase 1
as worked examples. Read both before starting.

---

## 1. The loop for every task

Run this loop for each request, big or small. Skipping a step is where
mistakes came from.

1. **Restate the goal in one sentence, then find the question behind it.**
   The literal ask is rarely the real one. "Should we keep Astro?" was really
   "where did the old conflict come from, and would it come back?".
2. **Look before you answer.** Open the repo, the build output, the data.
   Enumerate what exists (a survey script, a `grep`, a `git ls-tree`). Never
   answer from memory or from what the docs claim; the docs in this repo were
   wrong twice (the Tailwind ban, the "always noindex" comment).
3. **Sort what you found into facts, inferences, and decisions.** Facts you
   measured. Inferences you believe and can test. Decisions belong to Yanice.
   Say which is which when you report.
4. **Pick the reversible path with a built-in check.** Prefer `git mv` /
   `git show` over rewriting; prefer a lossless remux over a re-encode;
   prefer a diff against the previous build over "looks the same".
5. **Order work by dependency and by what makes later steps cheaper.** The
   reference case page comes before the other seven; the spacing token pass
   comes right after the reference page and before the other seven.
6. **Work in slices you can verify, verify each, commit each.** A slice ends
   with a command that proves it (`npm run check`, `npm run build`,
   `npm run smoke`, a diff, a checksum).
7. **Report outcome first, then evidence, then what you did not do and why.**
   If something was skipped or blocked, it goes in the first paragraph, not
   the last.

## 2. Worked examples from phase 1

These are the actual reasoning chains. Reuse the shape, not the conclusions.

### 2.1 "Astro or something else?"

- Literal ask: pick a framework. Real question: what caused the old conflict.
- Looked: `package.json`, `astro.config.mjs`, `src/data/motion.ts`
  ("Webflow IX2 is a separate writer, do not compete"), a 19,577-line Webflow
  CSS, jQuery, `docs/EXTENDING.md` banning Tailwind and shadcn.
- Facts: the conflict was between the Webflow runtime and any new code
  writing the same DOM properties. Inference: with Webflow gone, the conflict
  is gone regardless of framework. Inference: 21st.dev components looked bad
  because the repo forbade their dialect (Tailwind/shadcn), not because of
  Astro.
- Decision offered, with reasons ranked: keep Astro; add Tailwind + shadcn
  conventions; rebuild case pages; content into collections.
- Lesson: trace a symptom to its mechanism before proposing a change of tool.

### 2.2 Extracting the Webflow content

- Goal: every word and media reference survives, in a form the new UI can
  consume. Not: preserve layout.
- Built a survey first (per page: headings, paragraphs, images, lightboxes,
  videos, iframes, Lottie, external links). Only then wrote the extractor.
- Evaluation was numeric, not visual: for every page, the set of words in the
  original body minus the set of words in the Markdown had to be empty; every
  `/assets/...` reference had to exist on disk; zero `-p-NNN` variants.
- Iterated on artifacts found by grepping the output (zero-width joiners
  inside bold, `<br>` inside `**`, block-level links losing their href).
  Each fix was re-verified with the same checks.
- Lesson: define "complete" as a measurable property before you start, then
  keep measuring until it holds.

### 2.3 The four `.mov` videos

- Ask: "make them work on the web without losing anything."
- Did not assume they needed re-encoding. Probed the container: all four were
  H.264 (`avc1`) inside QuickTime, no audio. So the fix is a container swap,
  which is lossless.
- Remuxed with `-c copy`, then proved it: frame count, resolution, fps
  identical, and the MD5 of the decoded frames identical to the original.
- Lesson: the cheapest fix that can be proven lossless beats the "safe"
  re-encode that silently degrades.

### 2.4 The scope misunderstanding

- Yanice had said "all UI will change", so phase 1 removed her Astro landing
  and nav along with Webflow. Later she said those were hers and should stay.
- Response: state the mistake in one paragraph, show a table of which part of
  the old site was hers and which was Webflow, propose the two paths (restore
  from `main` vs rebuild from Figma) with a recommendation, and ask one
  yes/no question. Then wait.
- Restore was done from git history, not from memory, and parity was proven
  by building the base commit in a worktree and diffing normalised HTML/CSS.
  The only differences were the ones we intended.
- Lesson: when a premise turns out wrong, say so plainly and immediately,
  quantify the impact, offer a reversible fix. Do not quietly patch around it.

### 2.5 The sandbox refusing bulk deletes

- `rm -rf`, `git rm -f` over 826 files, and `xargs rm` were all blocked.
- Did not try to sneak around it. Found the equivalent reversible path
  (unstage the renamed variants so they are simply not committed), verified
  the commit had zero variants, and told Yanice exactly what happened and why
  the working tree still had the files.
- Lesson: a blocked action is information, not an obstacle to route around.
  Find the honest equivalent; report the residue.

### 2.6 Ordering the plan

- Opus Clip first because it contains every special element (videos, Lottie,
  dark theme, motion). If the template survives Opus Clip, the other seven
  are template applications.
- The spacing/layout unification goes after Opus Clip and before the other
  seven: before, there is nothing to unify against; after, eight pages get
  touched twice.
- Lesson: sequence by "which step, done first, removes the most uncertainty
  from the others".

## 3. Evaluation checklists

Use the one that matches the kind of change. "It works" without one of these
behind it is not a claim you may make.

### 3.1 Before changing anything

- What is the source of truth for this? (content file, Figma frame, git
  history, Yanice's message by ID)
- What else reads or writes the same thing? (`grep` for the selector, the
  variable, the path)
- How will I know it worked? Name the command or diff before writing code.
- Is it reversible? If not, is it explicitly authorised?

### 3.2 Content fidelity (any change to `src/content`)

- `npm test`: every asset reference resolves, required frontmatter present,
  slug equals filename.
- Word coverage against the source when migrating (see extractor report).
- Read three entries end to end, not just the first screen.
- Trusted HTML fields (`about.stories[].html`) contain only `<strong>`, `<br>`,
  `<em>`; anything else is a question for Yanice.

### 3.3 Parity of kept surfaces (landing, nav, footer, panels)

- Build the reference commit in a worktree; build the branch.
- Normalise both `dist/index.html` (split on `>`, mask `_astro` hashes and
  `astro-xxxxxxxx` scoped classes, drop the `#yy-content` block) and diff.
- Normalise the landing CSS bundle the same way and diff. Minifier
  reorderings are fine; a changed value, a missing rule, a new rule is not.
- Every remaining difference must be one you intended and can name.

### 3.4 New pages and components

- `npm run check` (types), `npm run build`, `npm run smoke` against the
  preview, then the tunnel URL for Yanice. In that order; do not send a tunnel
  URL for something that fails the first three.
- Extend `scripts/smoke.mjs` with one assertion per new user-visible behaviour
  (component rendered, link target, theme attribute, video attributes).
- Accessibility basics: one `<main>`, headings in order, `alt` on every
  content image (empty `alt` on decoration), focus order unchanged by chrome,
  `prefers-reduced-motion` honoured by every motion.
- Performance sanity: lightest `client:*` directive that works;
  `preload="none"` on below-the-fold video; Lottie loaded on visibility;
  `width`/`height` on images; no new dependency without a reason in the
  commit message.
- Content separation: no sentence typed into a `.astro`/`.tsx` file.

### 3.5 Media

- Probe before touching (codec, dimensions, fps, audio).
- Lossless path first (remux, rename). If a re-encode is unavoidable, ask,
  and keep the original in git history with the commit that removed it named.
- Prove: dimensions/fps/duration equal; for lossless, decoded-frame checksum
  equal.

### 3.6 Design handoff (Figma → code)

- Map every frame component to a content field or a component prop before
  writing code. Anything with no source is either new content (ask) or
  decoration (note it).
- List states the frame does not show: hover, focus, reduced motion, dark
  variant, empty (no video/no cover), very long title, mobile.
- Measure spacing and type from the Figma inspector; never eyeball.
- Build one page against the design, get it approved, then generalise.

### 3.7 Communication (run on every reply to Yanice)

- Outcome in the first two sentences.
- Every technical term explained once in plain words the first time.
- Every question has an ID she can answer with one line.
- What was NOT done, and why, is stated explicitly.
- No request for her to run a command or open a file.
- Chinese in chat; the tunnel URL when there is something to look at.

### 3.8 Self-review before every push

- Re-read the diff as a hostile reviewer: what would break CI, what would
  surprise Yanice, what did I change that the task did not ask for?
- Commit message says why, not just what.
- `git status` clean; no scratch files; no `-p-NNN` variants; no `.mov`.

## 4. Proceed or ask?

Proceed without asking when the change is reversible, inside the current
step, and its verification is defined. Examples: fixing a build error,
extending the smoke test, restructuring a content file without changing its
words, reordering commits.

Stop and ask (one question, with a recommended default) when the change
would: alter something Yanice will see in a way her Figma does not cover;
delete or degrade content or media; contradict a decision in
`HANDOFF.md §5`; add a dependency that changes how the site is built or
hosted; or cost more than roughly a day to undo.

When in doubt, do everything that does not depend on the answer, then ask.

## 5. Habits of mind, in one list

- Mechanism before tool: find why something fails before changing what does it.
- Numbers before adjectives: "231 references, 0 missing" beats "looks complete".
- History before invention: `git show` beats retyping.
- Slice before sprint: one verifiable change, one commit.
- Plain words before jargon: she is a designer; write for her.
- Residue before silence: whatever you could not do goes in the first paragraph.
