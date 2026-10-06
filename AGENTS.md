# Restaurant Reservation System

This is Marvin's restaurant reservation project. Read `README.md` and the roadmap in `PLAN.md` before starting or resuming implementation. The current phase, completion checks, checkpoint, and next action live in `PLAN.md`.

## Working location and ownership

- Marvin requested that the working project files live on his Windows Desktop. The canonical folder is `C:\Users\burgo_w8uuyg3\OneDrive\Desktop\restaurant-reservation-system`, accessible to these tools at `/mnt/c/Users/burgo_w8uuyg3/OneDrive/Desktop/restaurant-reservation-system`.
- Make future project changes in that Desktop folder. The previous `/home/morkmork26/marvin/restaurant-reservation-system` entry now points to it; the dated Linux backup is for recovery only.
- This remains Marvin's project. Respond in natural Taglish and preserve the repository's Marvin Git author identity. Verify GitHub CLI uses `marvmarv08` before any GitHub operation; relocating files does not authorize publication or shared-account switching.
- Keep existing private configuration and Docker database volumes intact. The Desktop includes the ignored `.env`; never print its contents, commit it or overwrite it with example credentials.

When a phase is finished:

1. Verify its completion check with real evidence. Do not mark a phase complete based on prototype or mock behavior.
2. Update the phase-progress row, current checkpoint, and next concrete action in `PLAN.md`.
3. Run `python3 scripts/export_roadmap.py` to refresh the Windows Desktop roadmap. If writing outside the workspace needs platform approval, request it through the tool rather than bypassing it.
4. Check that the Desktop export contains the new status and that `git diff --check` passes.

Keep the status in `PLAN.md` authoritative. The Desktop text file is a readable copy for Marvin, not a second place to edit project status.

<!-- pmm-runtime:start -->
## PMM Runtime

- Managed runtime version: `0.5.1`.
- Before non-trivial task writes, run the installed `pmm-task.sh upgrade --project . --auto --owner <agent-id>` Upgrade Gate.
- Treat `docs/00-project-memory/runtime-state.md` as project runtime state; compatibility readers are for migration, recovery, rollback, and ambiguity review only.
- Keep exactly one primary task in `active-task.md`; concurrent writers use isolated branches/worktrees and work-item files.
<!-- pmm-runtime:end -->
