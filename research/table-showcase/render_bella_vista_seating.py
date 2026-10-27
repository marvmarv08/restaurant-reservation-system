"""Render assignment seating using the preserved original Blender geometry.

Run from Blender with --samples 32 --size 960. No website or database writes;
output is isolated from both published assets and the original render archive.
"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import shutil
import sys

import bpy

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--size', type=int, default=960)
    args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    options = parser.parse_args(args)
    original = ROOT / 'render_seating.py'
    build = runpy.run_path(str(original))['build']
    inventory_path = ROOT / 'bella-vista-inventory.json'
    tables = json.loads(inventory_path.read_text())['tables']
    output = ROOT / 'assets/bella-vista-seating'
    output.mkdir(exist_ok=True)
    manifest, layouts = [], {}
    for table in tables:
        path = output / (table['code'] + '.jpg')
        key = (table['shape'], int(table['capacity_max']))
        if key in layouts:
            source, template = layouts[key]
            shutil.copy2(source, path)
            entry = {**template, 'code': table['code']}
        else:
            entry = build(table, options.samples, options.size)
            bpy.context.scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            layouts[key] = (path, dict(entry))
        entry.update(
            file=path.name, bytes=path.stat().st_size,
            sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            source='Original Blender geometry / render_seating.py; Bella Vista profile / render_bella_vista_seating.py; CC0 Poly Haven wood texture',
            renderer=bpy.app.version_string, samples=options.samples,
            recipe_sha256=hashlib.sha256(original.read_bytes()).hexdigest(),
            profile_recipe_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
            inventory_sha256=hashlib.sha256(inventory_path.read_bytes()).hexdigest())
        manifest.append(entry)
        print('SEATING_RENDERED ' + table['code'], flush=True)
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
