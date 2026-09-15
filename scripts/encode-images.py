#!/usr/bin/env python3
"""Encode existing photos as AVIF, retaining WebP as the browser fallback.

Run with Pillow (AVIF support required). No scene, crop or dimensions change.
These generated assets are committed so deployment needs only Node.js.
"""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'public/assets'
mobile = assets / 'images/heat-pump-home-768.webp'
if not mobile.exists():
    with Image.open(assets / 'images/heat-pump-home-1600.webp') as image:
        image.resize((768, 432), Image.Resampling.LANCZOS).save(mobile, 'WEBP', quality=82, method=6)
before = after = 0
for source in sorted(assets.rglob('*.webp')):
    if source.name == 'logo.webp':
        continue
    target = source.with_suffix('.avif')
    if not target.exists():
        with Image.open(source) as image:
            image.save(target, 'AVIF', quality=50, speed=6)
    before += source.stat().st_size
    after += target.stat().st_size
with Image.open(assets / 'logo.png') as image:
    image.save(assets / 'logo.webp', 'WEBP', lossless=True, method=6)
with Image.open(assets / 'favicon.ico') as image:
    image.resize((32, 32), Image.Resampling.LANCZOS).save(assets / 'favicon.png', 'PNG', optimize=True)
print(f'Photo bytes: WebP {before:,} → AVIF {after:,} ({1-after/before:.0%} smaller)')
