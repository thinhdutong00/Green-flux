"""Compatibility entry point. Edit content/site-content.json and templates/."""
import subprocess
from pathlib import Path
root = Path(__file__).resolve().parents[1]
subprocess.run(["node", "scripts/render-site.mjs"], cwd=root, check=True)
