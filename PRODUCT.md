# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
React 18 + Vite + TypeScript, react-router, recharts, framer-motion, three.js (landing only). Backend is FastAPI on a shared Hugging Face Space. Existing codebase, so the stack is settled.

## Users
Fab yield and process engineers who scan wafer maps and decide ship, review or scrap. Also first-time visitors (students, recruiters) judging the project in seconds, so it must work as a real tool and impress cold. An admin approves new accounts.

## Product Purpose
Waferscope classifies a wafer map into one of the nine WM-811K defect patterns, computes Murphy yield, and returns a SAVE, REVIEW or SCRAP verdict with an expert explanation. Success: someone drops a map and trusts the verdict within seconds.

## Positioning
A guest can scan a wafer with no account; the signed-in app adds batch scans, drawing a map, yield-versus-die-size curves, history, reports and an AI expert chat. Few student wafer projects ship this full a workflow.

## Operating Context
Inputs are wafer map images (PNG or JPG). Die area per wafer and a wafer ID are set per run. Results save to a per-user history. Admins review access requests and manage people.

## Capabilities and Constraints
- Nine patterns: Center, Donut, Edge-Loc, Edge-Ring, Loc, Near-full, Random, Scratch, None.
- Murphy yield: SAVE at 70% and above, REVIEW at 40% and above, otherwise SCRAP.
- Backend lives on a shared free Hugging Face Space; only `main` runs. Mail goes through an HTTPS relay (SMTP blocked).
- Signed-in app routes: scan, batch, draw, yield, history, reports, people (admin only).
- Open: real model accuracy number is unknown and must not be shown or invented.

## Brand Commitments
Name Waferscope. Acid lime #c6ff3d and hot pink #ff2e93 on near-black, Unbounded for display, Schibsted Grotesk body, JetBrains Mono for data. Gen-Z, bold, big type, a 3D iridescent wafer on the landing. The landing concept (single approved HTML file) is binding and must be reproduced exactly.

## Evidence on Hand
No real customers, benchmarks or accuracy figures. Demo data only through a local mock backend, labelled synthetic.

## Product Principles
- The verdict is the product: every screen leads to ship, review or scrap fast.
- Show the wafer, not just numbers: the die map is the proof.
- No claim the backend cannot back up.
- Cold visitors and daily users get the same screens; neither is dumbed down.
