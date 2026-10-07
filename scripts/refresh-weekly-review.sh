#!/usr/bin/env bash
# Rebuild the weekly-review workbench from Brian's current weekly plan projection.
# Usage: scripts/refresh-weekly-review.sh   (run from the representation-router checkout)
set -euo pipefail
cd "$(dirname "$0")/.."
PM="${WEEKLY_PLANS_PLANNING_MODEL:-$HOME/code/weekly-plans/personal/planning-model}"
# --project regenerates the projection from THIS_WEEK.md first (one LLM call,
# strict citation validation; see weekly-plans/scripts/project_visual_planning.py).
if [ "${1:-}" = "--project" ]; then
  python3 "$(dirname "$PM")/../scripts/project_visual_planning.py" --write
fi
python3 "$PM/check_visual_planning.py"
node scripts/build-weekly-review.mjs \
  --planning-model "$PM/visual-planning.current.json" \
  --review-model "$PM/completed-work-review.current.json"
echo "Built artifacts/weekly-plans-review/index.html — served at http://localhost:8123/ by the weekly-review user service if enabled."
