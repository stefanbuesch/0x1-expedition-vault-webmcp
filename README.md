# 0x1 Expedition Vault — WebMCP Learning Roguelike

0x1 Expedition Vault turns source material into a branching learning expedition that a human and a browser agent can run together.

The central idea is deliberately WebMCP-native: the learner UI and the browser agent do **not** maintain separate copies of the course. The page registers structured tools on `document.modelContext`; those tools read and mutate the same room graph, checkpoint index, mastery/belief trajectory, source provenance, and run state visible on screen.

## Why WebMCP

Traditional browser agents have to infer intent from buttons and page layout. Expedition Vault exposes the learning actions directly:

- `ingest_learning_material` — forge and launch a branching expedition from a topic, YouTube URL, public article/PDF URL, or raw text.
- `explore_module` — enter an available room while respecting prerequisite locks.
- `submit_solution` — answer the current quiz, recall, transfer, adversarial, or boss checkpoint through the same validation path as the learner.
- `inspect_progress` — read mastery, run depth, active checkpoint, source provenance, evidence, and belief trajectory.

The visible WebMCP bridge shows the actual product contract:

`Browser agent → document.modelContext → four tools → one shared expedition state → human UI`

A browser-agent action is immediately reflected in the map, room state, mastery, and event log. Human actions update the same state that WebMCP reads. Tool schemas are registered once per pack/module schema and reused across ordinary checkpoint, belief, and navigation mutations rather than being torn down and rebuilt on every state change.

## Product experience

- Persistent **Vault** with real knowledge-pack cards, saved progress, source type, mastery, and resume state.
- Dynamic **Forge** for topics, YouTube lectures, public webpages/PDFs, pasted notes, and `.pdf` / `.txt` / `.md` uploads.
- Public YouTube captions are extracted when available and used to ground generated concepts and questions; when a serverless datacenter is denied captions, the app keeps the real video metadata/playback and reports transcript unavailability instead of pretending transcript grounding.
- An 8-room / 6-stage branching expedition template with route choices, convergence, cognition checks, and a boss defense.
- Multi-part rooms such as source → retrieval, quiz → recall, recall → adversarial dialogue, and transfer → falsification.
- Explicit cognition gates including blind transfer, source-vs-inference separation, adversarial prediction, and integrative defense. Source-hidden gates conceal their rubric/hints, discount scoring terms already supplied by the question, and route human/WebMCP text answers through the same semantic evaluator rather than a verbosity heuristic.
- Full-screen encounter UI with visible checkpoint completion, belief deltas, run progress, next-route unlocks, and post-run state.
- WebMCP Console showing `document.modelContext` status, registered tools, shared state, recent human/WebMCP events, and belief trajectory.

## Source ingestion

The server extraction route supports:

- YouTube URLs: video metadata plus caption transcript when publicly available.
- Public HTTP(S) webpages: readable text extraction with redirect and size limits.
- Public PDF URLs and uploaded PDFs through a serverless-native PDF parser; image-only PDFs fail explicitly instead of silently producing an empty course.
- `.txt` and `.md` uploads.
- Streaming 8 MB response limits plus private/reserved-network and credential-bearing URL blocking to prevent SSRF-style access.

## Run locally

```bash
npm install
npm run dev
```

Validation:

```bash
npm run check
npm run build
```

## Testing WebMCP

Use ChatGPT's in-app browser, which supports WebMCP, or a supported Chrome build with WebMCP testing enabled. The application registers its tools from `src/lib/learning/webmcp.js`.

Open the **WebMCP** tab in the app to inspect the shared-state bridge and exact tool surface.

## Architecture

Key files:

- `src/routes/+page.svelte` — shared run state, persistent pack vault, human/WebMCP orchestration.
- `src/lib/learning/webmcp.js` — native `document.modelContext.registerTool(...)` registrations.
- `src/lib/learning/ingestion.js` — deterministic source-grounded curriculum generation.
- `src/lib/learning/DungeonMap.svelte` — branching expedition graph.
- `src/lib/learning/EncounterRoom.svelte` — multi-part room runtime and cognition checks.
- `src/lib/learning/evaluation.js` — shared human/WebMCP semantic checkpoint evaluation.
- `src/routes/api/extract/+server.js` — URL, YouTube transcript, and document extraction.

## License

MIT. See [LICENSE](./LICENSE).
