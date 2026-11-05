"""Send each prepared OpenUI prompt to a model through llm_client and save the full exchange."""
import json, sys, time
from pathlib import Path
from llm_client import call_llm

run_dir = Path(sys.argv[1])
models = sys.argv[2].split(",")
for path in sorted(run_dir.glob("*.input.json")):
    item = json.loads(path.read_text())
    for model in models:
        tag = model.split("/")[-1]
        out = path.with_name(path.name.replace(".input.json", f"--{tag}.output.json"))
        if out.exists():
            print(f"skip {out.name}"); continue
        t0 = time.time()
        result = call_llm(model, [{"role": "system", "content": item["system"]}, {"role": "user", "content": item["user"]}],
                          task="openui-router-check", trace_id=f"openui-check/2026-10-24/{item['case']}/{item['mode']}/{tag}", max_budget=0.50, reasoning_effort="low", model_justification="second model family so the OpenUI router check is not one model's habit")
        out.write_text(json.dumps({"model": model, "seconds": round(time.time() - t0, 1), "cost": result.cost,
                                   "usage": result.usage, "content": result.content}, indent=2))
        print(f"{out.name}: {round(time.time()-t0,1)}s ${result.cost:.4f}")
