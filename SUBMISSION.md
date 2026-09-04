# WebMCP Challenge Submission — 0x1 Expedition Vault

## One-line pitch

Turn any source into a branching learning roguelike where a human and a browser agent share one live expedition state through WebMCP.

## Why this is a strong fit for WebMCP

Learning is a stateful workflow, not a one-shot chat. A learner may be midway through a room, on one branch of a curriculum, with a specific mastery trajectory and locked prerequisites. A browser agent should not have to infer that state from buttons, scrape labels, or maintain a private duplicate.

Expedition Vault exposes the meaningful learning actions directly through `document.modelContext`. The agent can forge a course, enter available rooms, submit solutions, and inspect progress. Those actions use the same state and validation paths as the learner UI. When the agent changes the run, the human immediately sees the map, checkpoint, mastery, and event history change.

## What people and agents can do together

A learner can ingest a lecture or document, study a source room, solve a retrieval checkpoint, and then ask a browser agent to inspect the run or continue an eligible challenge. The agent respects the same prerequisite gates and cannot counterfeit human-only source viewing. Human and agent work can alternate inside one expedition rather than being two disconnected conversations.

Examples:

- A human watches a source video; WebMCP refuses to fake the viewing step.
- The browser agent calls `inspect_progress` and sees the exact current room/checkpoint and belief trajectory.
- The agent calls `explore_module`; the visible UI enters that same room.
- The human clears one checkpoint; the agent can solve the next checkpoint through `submit_solution`.
- A WebMCP tool call can forge a completely new source-grounded branching expedition via `ingest_learning_material`.

## How WebMCP is implemented

`src/lib/learning/webmcp.js` registers four tools directly on `document.modelContext`:

1. `ingest_learning_material`
2. `explore_module`
3. `submit_solution`
4. `inspect_progress`

Tool registration follows the pack/module schema rather than every transient state mutation: once the four tools are registered for a pack, checkpoint, belief, and navigation changes reuse those registrations. Tools call the same action functions used by the page runtime; there is no second agent-only course state. The UI includes a visible WebMCP bridge and console showing the model-context connection, registered tools, live run state, and latest shared mutations.

## Product flow

1. Open the Vault and choose or create a knowledge pack.
2. Forge from a topic, YouTube URL, public article/PDF URL, notes, or file upload.
3. The app extracts source material and creates an 8-room / 6-stage branching expedition.
4. Play multi-part rooms: source study, quizzes, causal recall, adversarial dialogue, blind transfer, falsification, and boss defense.
5. Human and browser agent can alternate actions on the same run.
6. Complete the boss and reach a visible 100% run state.

## What makes the learning loop different

The generated curriculum deliberately separates study from cognition checks. Later stages hide source answers and test retrieval, causal intervention, source-vs-inference separation, blind transfer, falsification discrimination, adversarial prediction, boundary retrieval, and integrative defense.

## Judge testing

Use ChatGPT's in-app browser or Chrome with WebMCP testing enabled.

- Open the WebMCP tab to verify `document.modelContext` status and the four tools.
- Invoke `inspect_progress` to read the shared run state.
- Invoke `explore_module` on an available room and observe the human UI enter it.
- Invoke `submit_solution` on an eligible non-video checkpoint and observe progress/mastery update.
- Invoke `ingest_learning_material` with a topic or source and observe a new branching expedition replace the active run while remaining saved in the Vault.

## Built with

SvelteKit, Svelte 5, Vite, WebMCP / `document.modelContext`, opportunistic YouTube transcript extraction with metadata fallback, serverless-native PDF extraction, and browser local storage.
