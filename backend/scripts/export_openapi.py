"""Export the FastAPI OpenAPI schema to a static JSON file.

Run from the repository root:
    python -m backend.scripts.export_openapi

Or directly:
    python backend/scripts/export_openapi.py

The output is written to ``frontend/openapi.json`` and is consumed by the
``npm run openapi:types`` script in ``frontend/`` to regenerate TypeScript
types under ``frontend/src/api/generated.ts``.

Keeping the schema as a committed file makes the codegen deterministic
in CI: the frontend type-check does not need a running backend.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Allow running this script directly (`python backend/scripts/export_openapi.py`)
# without setting PYTHONPATH: backend/ is added to sys.path so `from app.main`
# works regardless of the cwd from which the script is invoked.
_BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from app.main import app  # noqa: E402  (sys.path adjusted above)


def main() -> None:
    schema = app.openapi()
    repo_root = Path(__file__).resolve().parents[2]
    out_path = repo_root / "frontend" / "openapi.json"
    out_path.write_text(json.dumps(schema, indent=2, sort_keys=True), encoding="utf-8")
    print(f"Wrote {out_path.relative_to(repo_root)}")


if __name__ == "__main__":
    main()
