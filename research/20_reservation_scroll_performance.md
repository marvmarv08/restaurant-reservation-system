# Reservation-page scrolling performance — 2026-10-30

Marvin reported lag while scrolling the reservation page (Screenshot2026-10-30 141739) and explicitly approved private GitHub/Vercel publication after local verification. Preserve the existing restaurant design, form, data, responsive layout and video ambience when stationary.

## Diagnosis and implemented change

The screenshot is /reserve, not the new introduction. Reproduced avoidable competing work: decorative hero/chef playback and food-gallery motion continued during viewport scrolling; new section-entry animations started during scroll; navigation rewrote the same aria-current attribute on nearly every sampled frame.

Added one shared passive viewport-scroll activity signal. Videos/gallery temporarily pause while scrolling and resume160ms after settling only when still visible, not hidden, not reduced-motion and not failed. The hero retains its last visible frame during scrolling rather than flashing back to its poster. New entrances are skipped and existing entrances cancelled during active scrolling; normal content stays visible. Horizontal gallery scroll does not trigger viewport activity. Navigation only writes state when the selected section changes. No wheel/touch interception, booking behavior, images or pricing changes.

## Measurements and limits

Initial1920×1000 headless Chromium120-frame comparison (before source changes):

```jsonl
{"variant":"baseline","headerMutations":119,"slowFrames":73,"maxFrame":79.20000000298023,"endY":0,"deltas":{"LayoutCount":4,"RecalcStyleCount":0,"ScriptDuration":0.02524,"LayoutDuration":0.00787,"RecalcStyleDuration":0,"TaskDuration":0.32481}}
{"variant":"no-navigation","headerMutations":0,"slowFrames":68,"maxFrame":74.90000000596046,"endY":0,"deltas":{"LayoutCount":4,"RecalcStyleCount":0,"ScriptDuration":0.00178,"LayoutDuration":0.00593,"RecalcStyleDuration":0,"TaskDuration":0.30337}}
{"variant":"paused-media","headerMutations":119,"slowFrames":13,"maxFrame":64.90000000596046,"endY":0,"deltas":{"LayoutCount":4,"RecalcStyleCount":0,"ScriptDuration":0.01868,"LayoutDuration":0.00326,"RecalcStyleDuration":0,"TaskDuration":0.2217}}
```

The pause-media probe reduced expensive frames in the initial sample. A final controlled comparison alternated original scripts from6fb79ae and fixed scripts on the same current page, with120 requested frames per run and a25ms slow-frame threshold:

```jsonl
{"variant":"before","frames":120,"slowFrames":39,"maxFrame":68.1000000089407,"navWrites":119}
{"variant":"after","frames":120,"slowFrames":49,"maxFrame":55.5,"navWrites":0}
{"variant":"after","frames":120,"slowFrames":42,"maxFrame":61.29999999701977,"navWrites":0}
{"variant":"before","frames":120,"slowFrames":58,"maxFrame":81.1000000089407,"navWrites":119}
```

Frame timings vary and the controlled slow-frame results overlap (39/58 original versus49/42 fixed); this is not evidence of a guaranteed overall FPS improvement on Marvin's hardware. The consistent result is119→0 redundant navigation mutations, with direct regression evidence that decoding/gallery/entrance work stops during scrolling. These headless samples are diagnostic laboratory data, not a physical-device benchmark. Actual browser scrolling remains Marvin's acceptance check; do not claim all device lag is eliminated.

## Verification

Observed a failing hero-pause assertion before implementation. An additional failing test reproduced two running section-entry animations during scrolling before the entrance guard. Final8 scrolling regressions pass: pause/freeze/last-frame preservation, form state, idle resume, zero repeated navigation writes, offscreen/reduced/hidden timer guards, gallery/chef suspension, no active-scroll entrances, phone behavior and no browser errors/HTTP writes.

Existing12 hero,8 chef,20 gallery,27 intro/navigation and17 menu checks passed again on the final source (92 total including the8 new checks). Independent read-only review found no issue and additionally verified phone horizontal-scroll independence, unsubscribe behavior, pending reduced-motion state, no-JavaScript fallback, cancellation visibility and idle entrance recovery.

PHP111 lint, all public JS parse checks, whitespace and preview smoke passed. Exact Docker release image matched221 source/asset hashes with private/research/test inputs absent; disposable-image smoke and script-order checks passed. Main/preview all-table fingerprints match the fresh baseline. Full legacy guest-motion/write suites were not run because they reset populated fixtures; focused non-destructive behavior and independent review were used. No database reset/import/migration or hosted privacy change belongs to this fix. Publication receipt follows in project deployment notes.
