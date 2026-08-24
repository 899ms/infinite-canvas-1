# FrameFlow Context

> Handoff snapshot: 2026-08-22

## Continue From Here

This repository is the active Web-first Infinite Canvas + FrameFlow workspace. Continue in this existing checkout and preserve all current modified and untracked files; they include the user's ongoing product work and must not be reset or replaced.

- Repository: `F:\GJ\生图库\repo-research\basketikun-infinite-canvas`
- Web app: `http://127.0.0.1:3000/`
- FrameFlow review: `http://127.0.0.1:3000/frameflow?view=review`
- Canvas Agent: `http://127.0.0.1:17371/`
- Current state: both ports were listening at handoff time.
- Worktree: heavily modified with many untracked feature files. Treat every existing change as user-owned.
- Project rules: read the repository `AGENTS.md` before changing code.

## Product Direction

The product combines an Infinite Canvas creative workspace with FrameFlow, a personal aesthetic-training feedback loop. Image generation on canvas is intended to use the locally connected Codex ImageGen path where available. FrameFlow turns explicit review evidence into later Prompt versions while keeping all prompt, image, feedback, decision, and run lineage traceable.

Feedback semantics:

- 5 stars: strong reinforcement.
- 4 stars: continue nearby variations.
- 3 stars: neutral observation.
- 1-2 stars: downweight or avoid.
- `不喜欢并学习`: aesthetic soft delete and strong negative evidence; recoverable.
- `删除（不参与学习）`: remove from the review queue without contributing positive or negative Preference DNA; not recoverable from the current UI, while immutable historical events and referenced files remain intact.

## Recently Completed

### Neutral deletion separated from negative learning

Implemented a separate `image.delete` command and `image.permanently_deleted` event across FrameFlow schemas, reducer, core, browser API, tests, and review UI.

Expected behavior:

- Removes the image from the review queue.
- Clears its active rating, Comment, hidden reason, and DNA contribution from the projection.
- Does not add negative Preference DNA.
- Preserves immutable event history and underlying referenced image metadata/file so lineage and historical runs do not break.
- UI now clearly distinguishes `不喜欢并学习` from `删除（不参与学习）`.

Key files:

- `canvas-agent/src/frameflow/types.ts`
- `canvas-agent/src/frameflow/schemas.ts`
- `canvas-agent/src/frameflow/reducer.ts`
- `canvas-agent/src/frameflow/core.ts`
- `canvas-agent/src/frameflow/core.test.ts`
- `web/src/services/api/frameflow.ts`
- `web/src/pages/frameflow/review-view.tsx`

### Collapsible canvas node list

Added accessible open/close icons for the left canvas side panel:

- `web/src/components/canvas/canvas-side-panel.tsx`
- `web/src/components/canvas/canvas-top-bar.tsx`

The close control lives in the panel header; when collapsed, an open control is shown in the top bar.

## Verification Already Performed

- Confirmed the Web dev server was listening on port `3000`.
- Confirmed Canvas Agent was listening on port `17371` after restart.
- Confirmed the FrameFlow review UI rendered both deletion actions with the intended Chinese copy.
- Opened the neutral-deletion confirmation without confirming, so no real user image was deleted during verification.
- Confirmed the restarted Agent recognized the new command route using a nonexistent image ID; it returned the expected not-found response and did not mutate user data.
- `git diff --check` passed apart from expected Windows line-ending warnings.

The repository's `AGENTS.md` says full build/test execution is not required by default. Do not claim complete automated coverage. Run targeted checks when the next requested change makes them useful, and use disposable fixtures rather than deleting real user assets.

## Recommended Next Step

Start by reading this file and `AGENTS.md`, then inspect the current worktree before editing. The next sensible gate is a targeted end-to-end verification of neutral deletion using a disposable FrameFlow fixture, followed by the next user-selected product improvement. Do not archive or reset the current worktree.

FrameFlow autonomously plans, generates, machine-reviews, and iterates a bounded visual direction while preserving optional human feedback as separate, traceable preference evidence.

## Language

**Auto Run**:
A bounded autonomous loop that starts from a free-form Exploration Direction and lets Codex plan, generate, machine-review, record, and iterate until the configured maximum round count or a manual stop.
_Avoid_: Daily Collection, Schedule, timed task, human-gated loop

**Exploration Direction**:
A free-form starting intent that anchors the subject and desired feeling while allowing Codex to evolve the visual treatment across iterations.
_Avoid_: Direction preset, existing Brief selection, fixed style

**Machine Review**:
Codex's per-image rating, Comment, strengths, issues, and keep/vary/reject decision used to drive the next Auto Run iteration. It is stored independently and never masquerades as Human Preference Evidence.
_Avoid_: Review Gate, user rating, automatic deletion

**Human Preference Evidence**:
An explicit user rating, Comment, “不喜欢并学习”, or neutral deletion decision, scoped to the Creative Requirement that produced the reviewed image. It may correct later Brief Revisions of that same Requirement, but it is optional, never blocks Auto Run, and never crosses into another Requirement.
_Avoid_: Machine Review, inferred preference, global taste profile, cross-Requirement memory

**Iteration**:
One complete Auto Run cycle from Prompt planning through generation and Machine Review, with immutable Prompt, decision, image, review, and run lineage.
_Avoid_: Daily batch, scheduled run

**Exploration Extension**:
A user-authorized increase to a completed Auto Run's bounded round limit when its latest Iteration still contains a `vary` Machine Review, continuing on the same lineage.
_Avoid_: New Auto Run, restart, unbounded continuation

**Creative Requirement**:
The user-managed identity for one creative need. Its Human Preference Evidence is isolated from every other Requirement and remains available across its Brief Revisions.
_Avoid_: Global profile, Auto Run, Prompt

**Creative Brief Revision**:
An immutable snapshot of a Creative Requirement's current intent and hard constraints, including subject, purpose, format, required elements, and exclusions. Editing creates a successor Revision rather than rewriting prior lineage.
When a Revision comes from an Auto Run, the system may prepare a new paused Auto Run with the same bounded settings; the old Auto Run stays attached to the old Revision for lineage.
_Avoid_: In-place Brief edit, Auto Run rebinding, Prompt Version, preference

**Requirement Archive**:
A reversible removal of a Creative Requirement from active selection and work queues. Its Brief Revisions, runs, images, feedback, and decisions remain available only as read-only lineage until the Requirement is restored.
_Avoid_: Physical deletion, asset deletion

**Requirement Restoration**:
The reversal of a Requirement Archive that returns the current Brief Revision and its preserved descendants to active views without recreating or rewriting their lineage.
_Avoid_: Recreate Requirement, restore image

**Preference DNA**:
The current weighted view of explicit Human Preference Evidence for one Creative Requirement, derived through image, run, Prompt, and Brief Revision lineage.
_Avoid_: AI guess, style preset, global Preference DNA, account-wide preference

**Preference Evidence**:
An immutable rating or aesthetic rejection, linked to its reviewed image and the Prompt Version that produced it.
_Avoid_: Recommendation, inferred taste

**Agent Decision**:
The immutable planning record that states how one round adopted, avoided, or ignored each available Preference Evidence item and why.
_Avoid_: Prompt reason, generated summary

**Prompt Version**:
A reviewable prompt proposal produced for one Creative Brief Revision at a specific Prompt revision.
_Avoid_: Agent Decision, final image

**Prompt Diff**:
The field-level account of what a Prompt Version kept, added, changed, removed, or explicitly avoided, together with its evidence.
_Avoid_: Text diff, change log

**Generation Run**:
One approved Prompt Version executed for a fixed number of image slots.
_Avoid_: Round, Prompt Version

**Reference Asset**:
A verified local image copy imported into FrameFlow for use as Creative Brief evidence, with its external source identity and content hash preserved.
_Avoid_: Image Asset, browser asset, generated result

**Generation Cancellation**:
An accepted request that prevents a running or queued Generation Run from registering any later result as an Image Asset.
_Avoid_: Delete run, hide image

**Quarantined Asset**:
A generated file that is not referenced by committed lineage and is retained outside the Image Asset library with its recovery reason.
_Avoid_: Hidden asset, soft-deleted image
