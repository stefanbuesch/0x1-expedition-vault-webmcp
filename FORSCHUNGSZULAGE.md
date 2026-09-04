# Forschungszulage Engineering Diary

## 2026-09-04 06:51:53 CEST

I consolidated the WebMCP Expedition Vault around the existing expedition runtime instead of introducing another architecture. I treated the supplied expedition reference as the visual contract and optimized the implementation underneath it.

I reduced cold-view media work by deferring locked-room artwork, right-sizing runtime WebP assets, and adding density-aware map delivery. I kept the larger boss artwork only where the victory state actually needs it. I removed the external Google Fonts path so first paint no longer depends on a third-party font request.

I kept the browser agent and learner on one lived run state. WebMCP tool schemas now re-register only when the pack/module schema changes; ordinary belief, checkpoint, and navigation mutations reuse the same four registered tools. Vault writes are coalesced, histories are bounded, and elapsed run time advances only while the expedition is visible.

I hardened source ingestion without weakening the product claim: response bodies are stream-limited, private/reserved network ranges and credential-bearing URLs are rejected, serverless PDF extraction is native to the deployment, and image-only PDFs fail explicitly instead of silently generating from empty text. YouTube transcript use remains opportunistic; metadata fallback is explicit when datacenter caption access is blocked.

Measured production-preview state for this pass: roughly 471 KB total resource transfer at DPR 1 before the final density/locked-art refinements, about 648 ms local LCP, and zero Svelte diagnostics. The cognition contract remains unchanged: generic answers are rejected and source-grounded causal answers visibly advance checkpoints.

## 2026-09-04 07:07:50 CEST

I removed a legacy completion shortcut that treated answer length as evidence when a text checkpoint had no semantic targets. I consolidated human and WebMCP text evaluation into one shared semantic evaluator so both paths now apply the same target coverage, language-production, and causal-reasoning criteria.

I added hidden causal targets to the bundled Lenz dialogue and changed source-hidden cognition checks so the learner sees neither the scoring rubric nor source-specific hints/probes before answering. I verified the intended asymmetry directly: causal-sounding verbose nonsense scores 0% and is rejected, while a mechanism-grounded Lenz explanation scores 100% and clears the room. The same reject/pass behavior was verified through the registered WebMCP submit_solution tool.

## 2026-09-04 07:14:43 CEST

I tightened source-hidden cognition checks against prompt leakage. Source-text concept extraction now ignores course-title tokens when real source material exists, so scoring targets reflect mechanisms and evidence rather than the label of the course. For source-hidden checkpoints, the evaluator removes target tokens already present in the question before calculating coverage; restating the prompt therefore earns no hidden-target credit.

I tested every hidden stage in generated Feedback Control and Plate Tectonics packs. A verbose answer made from the prompt plus causal-sounding filler failed every hidden checkpoint, while answers containing learned source concepts plus causal/falsification structure passed every hidden checkpoint. This keeps the challenges solvable without exposing their answer key.

## 2026-09-04 07:43:57 CEST

I ran a production-oriented Lighthouse audit after freezing the runtime. The baseline scored 100 performance, 100 best practices, 100 SEO, and 95 accessibility. I traced the accessibility loss to compact microcopy contrast and ARIA names that overrode visible map/badge labels.

I darkened only the affected compact text states, removed mismatched map-node aria-label overrides, and included visible badge numbers in the concept-master accessible names. A clean local Lighthouse accessibility rerun then scored 100, with both color-contrast and label-content-name-mismatch audits fully passing. I kept the visual hierarchy and first-viewport density unchanged.
