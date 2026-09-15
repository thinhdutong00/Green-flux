"""Compatibility entrypoint: regenerate using the verified Green Flux content model.

The historical VenetaGreen BASE catalogue is intentionally no longer used.
"""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('align-green-flux-content.py')),run_name='__main__')
