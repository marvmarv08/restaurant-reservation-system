# Mobile food showcase motion

Marvin requested automatic food motion on phones while preserving the PC interface.

The previous JavaScript enabled motion only above 760px, and mobile CSS hid Pause/Resume. The phone layout intentionally supported manual swipe only.

The phone now slowly scrolls the existing horizontal photo strip, reversing at its ends. Touch pauses autoplay so a manual swipe is not pulled back by the animation; Resume restarts it. Offscreen, hidden, focused and reduced-motion states stop the frame loop. Desktop continues using the existing vertical CSS animation, dimensions and timing. No new dependency or network call is introduced.

Verification: the new real-browser phone autoplay assertion failed before implementation, then the complete 21-check showcase suite passed. It covers actual scroll movement, touch pause, resume, Reduce Motion, offscreen stop, desktop motion, keyboard focus, Pause/Resume, 320/390/768/1440px layouts, accessibility audit, menu navigation and static fallbacks. JavaScript syntax and git diff checks passed. One initial image-readiness timeout passed on an unchanged rerun before implementation.

Source commit: 6cd997a. READY Singapore Preview: [https://restaurant-reservation-system-5zi0dy0wz-marvmarv08.vercel.app](https://restaurant-reservation-system-5zi0dy0wz-marvmarv08.vercel.app), deployment `dpl_BE1VsLTruMiw8tEHLHsuW9fg3VYT`. Six additional read-only hosted checks passed: phone scroll movement, native touchscreen pause, reversal at the last photo, reduced motion, unchanged desktop vertical grid motion and no JavaScript errors. The phone screenshot was inspected; the controls and strip fit the screen. No QA staff account or booking was created for this change.

Lesson: Desktop and phone motion can use different mechanisms. Keep a phone swipe in the guest's control and stop automatic work while the gallery is hidden.
