# Realistic Bella Vista seating previews

Marvin approved realistic seating pictures matching the old application after B3. His latest screenshot, 2026-10-18 08:53:34, shows overlapping flat VIP chairs. Use the existing original Blender scene and licensed wood texture, with four seats for S1–S4, eight for F1–F3 and twenty for VIP1–VIP2. These remain illustrative concepts, not venue photographs or measured room plans.

Scope: add a separate nine-unit renderer wrapper and reproducible manifest; serve its local JPGs through the existing image loader; retain a legible missing-image diagram and existing availability behavior. Keep legacy images, booking policies, financial behavior, main database and main container unchanged. Correct the preview's outdated billing-pending description with the approved assigned policy, without claiming guest cart delivery.

- [x] Add failing asset/browser checks for target capacity, provenance and image loading.
- [x] Render and inspect the three distinct seating arrangements; publish nine code-specific images.
- [x] Enable the existing image loader for Bella Vista and improve dense fallback spacing.
- [x] Verify all nine images, stale load/navigation handling, missing-image fallback, responsive layout and accessibility in the isolated browser.
- [x] Review the change, verify protected files/main fingerprints, and update roadmap/memory/export.

Review correction: preserve the original renderer byte-for-byte; a separate Bella Vista wrapper imports its geometry. This keeps the old manifest hashes valid. Target assets live in their own public `bella-vista/` folder, preserving all legacy image files.

Final evidence: nine exact asset/provenance/spacing checks; 21 real browser checks; 38 legacy concept checks; Standard/Family/VIP plus 1366/320px screenshots inspected; syntax, isolated smoke and diff checks passed. All 37 main fingerprints/configuration and 261 unaffected source/assets preserved. Main activation remains pending.
