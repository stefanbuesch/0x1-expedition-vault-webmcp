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
