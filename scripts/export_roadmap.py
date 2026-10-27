"""Export the current PLAN.md phase roadmap as a Windows Desktop text file."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
PLAN = ROOT / "PLAN.md"
FILENAME = "Restaurant Reservation Roadmap.txt"


def desktop_file() -> Path:
    candidates = list(Path("/mnt/c/Users").glob(f"*/OneDrive/Desktop/{FILENAME}"))
    candidates += list(Path("/mnt/c/Users").glob(f"*/Desktop/{FILENAME}"))
    if len(candidates) != 1:
        raise RuntimeError(
            f"Expected one existing Windows Desktop copy, found {len(candidates)}. "
            "Create it first or supply its path as the first argument."
        )
    return candidates[0]


def parse_table(section: str, prefix: str) -> list[list[str]]:
    rows = []
    for line in section.splitlines():
        if line.startswith(prefix):
            rows.append([cell.strip().replace("**", "") for cell in line.strip("|").split("|")])
    return rows


def main() -> None:
    text = PLAN.read_text(encoding="utf-8")
    roadmap = text.split("## 1. Delivery roadmap and MVP line\n", 1)[1].split("\n---\n", 1)[0]
    phases = parse_table(roadmap, "| **P")
    progress = parse_table(roadmap, "| P")
    progress = [row for row in progress if re.fullmatch(r"P[0-7]", row[0])]
    if len(phases) != 8 or len(progress) != 8:
        raise RuntimeError("Expected exactly eight phase definitions and eight progress rows")
    statuses = {row[0]: row[1:] for row in progress}
    if set(statuses) != {f"P{i}" for i in range(8)}:
        raise RuntimeError("Phase progress must contain P0 through P7 exactly once")

    lines = ["BELLA VISTA DINING - RESERVATION AND FOOD ORDERING ROADMAP", "Source of truth: PLAN.md", ""]
    alignment_heading = "### Bella Vista assignment alignment — 2026-10-17"
    history_heading = "### Historical Lumina foundation — P0–P7"
    if alignment_heading not in roadmap or history_heading not in roadmap:
        raise RuntimeError("Missing active Bella Vista roadmap or historical foundation boundary")
    alignment = roadmap.split(alignment_heading, 1)[1].split(history_heading, 1)[0]
    compliance = [row for row in parse_table(alignment, "| B") if re.match(r"^B[0-8] — ", row[0])]
    if len(compliance) != 9 or {row[0].split(" — ", 1)[0] for row in compliance} != {f"B{i}" for i in range(9)}:
        raise RuntimeError("Expected exactly nine Bella Vista compliance phases B0 through B8")
    lines.extend(["ACTIVE BELLA VISTA ASSIGNMENT ALIGNMENT — 2026-10-17", alignment.strip(), "",
                  "HISTORICAL LUMINA FOUNDATION — completed under the previous scope; not Bella Vista acceptance", ""])
    for phase, work, done in phases:
        code = phase.split(" ", 1)[0]
        status, evidence = statuses[code]
        lines.extend(
            [phase, f"Status: {status}", f"Work: {work}", f"Done when: {done}", f"Evidence: {evidence}", ""]
        )
    for label in ("Current checkpoint", "Next concrete action"):
        match = re.search(rf"^\*\*{label}[^\n]*", roadmap, re.MULTILINE)
        if not match:
            raise RuntimeError(f"Missing {label} in PLAN.md")
        lines.extend([match.group().replace("**", "").replace("`", ""), ""])

    backlog_heading = "### Pending desktop UI improvements — next-session backlog"
    if backlog_heading in roadmap:
        backlog = roadmap.split(backlog_heading, 1)[1].split("\n### ", 1)[0]
        lines.extend(["PENDING DESKTOP UI IMPROVEMENTS — QUEUED BEHIND COMPLIANCE WORK" + backlog, ""])

    target = Path(sys.argv[1]) if len(sys.argv) > 1 else desktop_file()
    target.write_text("\n".join(lines), encoding="utf-8")
    print(f"Updated {target}")


if __name__ == "__main__":
    main()
