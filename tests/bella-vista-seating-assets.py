"""Verify the published native seating assets against the assigned inventory."""
import hashlib
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
assets = root / 'public/assets/images/table-showcase/bella-vista'
expected = {**dict.fromkeys(['S1', 'S2', 'S3', 'S4'], 4),
            **dict.fromkeys(['F1', 'F2', 'F3'], 8), 'VIP1': 20, 'VIP2': 20}
manifest = json.loads((assets / 'manifest.json').read_text())
assert {entry['code']: entry['seats'] for entry in manifest} == expected
recipe_hash = hashlib.sha256((root / 'research/table-showcase/render_seating.py').read_bytes()).hexdigest()
for entry in manifest:
    path = assets / entry['file']
    data = path.read_bytes()
    assert path.name == entry['code'] + '.jpg'
    assert data.startswith(b'\xff\xd8') and data.endswith(b'\xff\xd9')
    assert len(data) == entry['bytes'] and hashlib.sha256(data).hexdigest() == entry['sha256']
    assert entry['recipe_sha256'] == recipe_hash
    assert entry['profile_recipe_sha256'] == hashlib.sha256((root / 'research/table-showcase/render_bella_vista_seating.py').read_bytes()).hexdigest()
    assert entry['inventory_sha256'] == hashlib.sha256((root / 'research/table-showcase/bella-vista-inventory.json').read_bytes()).hexdigest()
    positions = entry['seat_positions']
    assert len(positions) == entry['seats'] and len(set(map(tuple, positions))) == entry['seats']
    # Native chairs are 0.44 m wide. Leave a physical gap between adjacent seats.
    assert all(math.dist(a, b) > .5 for i, a in enumerate(positions) for b in positions[i + 1:])
    assert 'illustrative' in entry['dimensions'] and 'Blender' in entry['source']
    print('PASS', entry['code'], entry['seats'], 'distinct spaced chairs; published asset hash/provenance')
print('PASS all nine Bella Vista seating assets')
