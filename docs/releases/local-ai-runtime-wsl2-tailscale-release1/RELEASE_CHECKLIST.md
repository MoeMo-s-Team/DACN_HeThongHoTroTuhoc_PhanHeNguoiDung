# CP-005 Downstream Release Checklist

- [x] Project Owner approved CP-005 on 2026-10-30; approval scope is recorded in the proposal and this release traceability.
- [x] Issue versioned SRS v1.7 and Architecture v1.2 downstream documents without modifying frozen source files.
- [x] Record Linux + Windows/WSL2 two-clone topology and one-runtime restriction.
- [x] Preserve the AI Contract, six tasks, model revision, authorization, capacity preflight, Bearer authentication and Lite PASS evidence.
- [x] Record Local GPU PASS as a separate actual-hardware gate; Phase B cleanup remains blocked until that gate passes.
- [x] Generate release checksums for the released files.
- [ ] Windows/WSL2 RTX 3050 hardware acceptance: PENDING teammate execution.
- [ ] Tailscale Serve/ACL and Linux live-wire verification: PENDING actual tailnet execution.
- [ ] Six-task Lite smoke on the teammate's GPU WSL2: PENDING actual hardware execution.
