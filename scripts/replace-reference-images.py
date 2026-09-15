#!/usr/bin/env python3
"""Apply the audited image mapping without changing page copy or layout.

One-off migration: requires Pillow and a JSON list of ImageGen assets, each with
id, path, prompt. Original assets are resized/encoded only; scenes are unchanged.
The historical import manifest remains in docs/reference-import.json.
"""
import argparse
import html
import json
import re
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / 'public'
PATTERN = re.compile(r'/assets/(?:venetagreen|ui)/[^\s\"\'<>),;]+\.(?:webp|png|jpe?g|svg|avif|ico)')
TEXT_EXTENSIONS = {'.html', '.css', '.js', '.mjs', '.json', '.xml'}
ICONS = {
    '001': 'arrow-up-right-white', '003': 'clipboard-check', '004': 'layers',
    '005': 'messages-square', '006': 'corner-white', '007': 'arrow-up-right',
    '009': 'house-plug', '011': 'flow-arrow', '017': 'drafting-compass',
    '018': 'file-check', '019': 'users-round', '020': 'circle-check',
    '021': 'house-plug-background', '022': 'house-plug-background',
    '023': 'house-plug-background', '024': 'phone', '025': 'mail',
    '026': 'map-pin', '033': 'corner-paper',
}
DESCRIPTIONS = {
    'heat-pump-home': 'pompa di calore esterna accanto a un’abitazione',
    'solar-home': 'abitazione con pannelli fotovoltaici su un tetto in coppi',
    'solar-commercial': 'pannelli fotovoltaici sulla copertura di un edificio industriale',
    'air-conditioning': 'soggiorno con climatizzatore a parete',
    'renovation-systems': 'posa di un impianto radiante durante una ristrutturazione',
    'technical-plant': 'locale tecnico con serbatoio e componenti dell’impianto termico',
    'solar-detail': 'dettaglio dei pannelli fotovoltaici su un tetto in coppi',
    'technician-heat-pump': 'tecnico con tablet accanto a una pompa di calore',
    'engineer-project': 'progettista che esamina una tavola tecnica',
    'project-plans': 'documenti e schemi di progetto su un tavolo di lavoro',
    'energy-consultation': 'consulenza su un progetto con disegni e computer',
    'solar-technician': 'tecnico che ispeziona pannelli fotovoltaici',
    'team-tablet-cutout': 'due professionisti che consultano un tablet',
}


def asset_id(url):
    if '/shared-cta-' in url:
        return 'team-tablet-cutout'
    if '/blog-v2/' in url:
        slug = url.split('/blog-v2/')[1].split('/')[0]
        if any(x in slug for x in ['aziende-green', 'venetagreen-recensioni', '6-kw-costo', 'installatori']):
            return 'energy-consultation'
        if any(x in slug for x in ['batterie', 'con-accumulo', 'blackout', 'inverter']):
            return 'technical-plant'
        if 'climatizzatore' in slug:
            return 'air-conditioning'
        if 'diagnosi' in slug:
            return 'technician-heat-pump'
        if 'aziendale' in slug:
            return 'solar-commercial'
        if 'pompa' in slug:
            return 'heat-pump-home'
        if 'pulizia' in slug:
            return 'solar-technician'
        if 'quanto-produce' in slug:
            return 'solar-detail'
        return 'solar-home'
    if '/chi-siamo-' in url:
        slot = re.search(r'chi-siamo-(\d)', url)[1]
        return {'0': 'solar-home', '1': 'solar-home', '2': 'technician-heat-pump',
                '3': 'technician-heat-pump', '4': 'engineer-project', '5': 'solar-technician'}[slot]
    if any(x in url for x in ['progetti-costruzioni', 'servizi-edilizia']):
        return 'renovation-systems'
    if any(x in url for x in ['metodo-', 'servizi-consulenza']):
        return 'project-plans' if 'metodo-2-' not in url else 'energy-consultation'
    if 'contatti-1-' in url:
        return 'technician-heat-pump'
    if 'servizi-climatizzazione' in url:
        return 'air-conditioning'
    if 'servizi-batterie' in url:
        return 'technical-plant'
    if 'servizi-manutenzione' in url or 'home-process' in url:
        return 'technician-heat-pump'
    if 'servizi-fotovoltaico-aziendale' in url:
        return 'solar-commercial'
    if 'pompe-calore' in url:
        return 'heat-pump-home'
    if any(x in url for x in ['preventivo-social', 'preventivo-twitter', 'blog-social']):
        return 'energy-consultation'
    if any(x in url for x in ['progetti-fotovoltaico-2-', 'servizi-fotovoltaico-residenziale-2-']):
        return 'solar-detail'
    return 'solar-home'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('assets', type=Path, help='JSON list: id, path, prompt')
    args = parser.parse_args()
    assets = json.loads(args.assets.read_text())
    assert {a['id'] for a in assets} == set(DESCRIPTIONS), 'Missing/unknown generated assets'
    dest = PUBLIC / 'assets/images'
    dest.mkdir(exist_ok=True)
    metadata = {}
    for asset in assets:
        with Image.open(asset['path']) as original:
            original.load()
            width, height = original.size
            if asset['id'] == 'team-tablet-cutout':
                assert 'A' in original.getbands(), 'CTA must have real alpha'
                assert original.getchannel('A').getextrema() == (0, 255), 'CTA alpha missing'
            maximum = min(1600, width)
            variants = {}
            for w in sorted({480, min(960, width), maximum}):
                h = round(height * w / width)
                name = f'{asset["id"]}-{w}.webp'
                resized = original.resize((w, h), Image.Resampling.LANCZOS)
                resized.save(dest / name, 'WEBP', quality=86, method=6)
                variants[w] = {'url': f'/assets/images/{name}', 'width': w, 'height': h}
            metadata[asset['id']] = {
                'description': DESCRIPTIONS[asset['id']], 'mode': 'built-in image_gen / generate',
                'prompt': asset['prompt'], 'original_size': [width, height],
                'variants': variants, 'focal_point': '72% center' if asset['id'] == 'heat-pump-home' else 'center',
            }

    icons = PUBLIC / 'assets/icons'
    (icons / 'arrow-up-right-white.svg').write_text((icons / 'arrow-up-right.svg').read_text().replace('#193e40', '#ffffff'))
    (icons / 'house-plug-background.svg').write_text((icons / 'house-plug.svg').read_text().replace('#193e40', '#ffffff'))
    for name, color in [('corner-white', '#ffffff'), ('corner-paper', '#f8faf6')]:
        (icons / f'{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260"><path d="M0 0H260V260Z" fill="{color}"/></svg>\n')
    (icons / 'flow-arrow.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="368" height="30" viewBox="0 0 368 30" fill="none"><path d="M1 15H366M353 2L366 15L353 28" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>\n')

    files = [p for p in PUBLIC.rglob('*') if p.suffix in TEXT_EXTENSIONS]
    references = sorted({u for p in files for u in PATTERN.findall(p.read_text())})
    mapping = {}
    for old in references:
        if '/assets/ui/' in old:
            number = re.search(r'asset-(\d+)', old)[1]
            mapping[old] = '/assets/icons/' + ICONS[number] + '.svg'
        else:
            key = asset_id(old)
            sizes = metadata[key]['variants']
            match = re.search(r'-(\d+)\.[a-z]+$', old)
            requested = int(match[1]) if match and int(match[1]) >= 320 else max(sizes)
            w = 480 if requested <= 480 else min(960, max(sizes)) if requested <= 960 else max(sizes)
            mapping[old] = sizes[w]['url']

    dimension_lookup = {v['url']: v for a in metadata.values() for v in a['variants'].values()}
    changed = []
    def image_tag(match):
        tag = match[0]
        source = re.search(r'\bsrc="([^"]+)"', tag)
        if not source or source[1] not in dimension_lookup:
            if 'house-plug-background.svg' in tag:
                tag = re.sub(r'\s(?:srcset|sizes)="[^"]*"', '', tag)
            return tag
        dimensions = dimension_lookup[source[1]]
        key = re.search(r'/assets/images/(.+)-\d+\.webp', source[1])[1]
        for attr in ['width', 'height']:
            tag = re.sub(rf'\b{attr}="\d+"', f'{attr}="{dimensions[attr]}"', tag)
        if 'aria-hidden="true"' not in tag:
            tag = re.sub(r'\balt="[^"]*"', f'alt="Immagine illustrativa: {html.escape(DESCRIPTIONS[key], quote=True)}"', tag)
        if 'data-image-asset=' not in tag:
            tag = tag.replace('<img ', f'<img data-image-asset="{key}" ', 1)
        if key == 'heat-pump-home':
            tag = re.sub(r'object-position:[^;\"]+', 'object-position:72% center', tag)
        if key in ['technician-heat-pump', 'engineer-project'] and 'team-image' in tag:
            tag = re.sub(r'object-position:[^;\"]+', 'object-position:center 22%', tag)
        return tag

    for file in files:
        original = file.read_text()
        updated = PATTERN.sub(lambda m: mapping[m[0]], original)
        updated = updated.replace('img[src^="/assets/venetagreen/"]', 'img[src^="/assets/images/"]')
        # Width descriptors must describe the actual encoded files, including portraits.
        updated = re.sub(r'(/assets/images/[^\s,\"<>]+-(\d+)\.webp)\s+\d+w', r'\1 \2w', updated)
        if file.suffix == '.html':
            updated = re.sub(r'<img\b[^>]*>', image_tag, updated)
            social = re.search(r'<meta\b[^>]*content="[^"\s]*(/assets/images/[^"\s]+)"[^>]*property="og:image"', updated)
            if social and social[1] in dimension_lookup:
                dimensions = dimension_lookup[social[1]]
                for attribute in ['width', 'height']:
                    updated = re.sub(rf'(<meta\b[^>]*content=")\d+("[^>]*property="og:image:{attribute}")',
                                     lambda m: m[1] + str(dimensions[attribute]) + m[2], updated)
        if updated != original:
            file.write_text(updated)
            changed.append(str(file.relative_to(ROOT)))
    script = ROOT / 'scripts/align-green-flux-content.py'
    script.write_text(script.read_text().replace('/assets/ui/asset-009.svg', '/assets/icons/house-plug.svg'))
    for old_directory in ['venetagreen', 'ui']:
        shutil.rmtree(PUBLIC / 'assets' / old_directory)
    manifest = {'date': '2026-09-15', 'assets': metadata, 'replacements': mapping, 'changed_files': changed}
    (ROOT / 'content/image-replacements.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(assets)} original images, {len(mapping)} imported asset references, {len(changed)} changed files')


if __name__ == '__main__':
    main()
