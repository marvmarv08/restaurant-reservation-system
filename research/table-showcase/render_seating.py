"""Build original static seating renders; run with Blender, never from the website.

The seat arrangement follows the former top view. Model dimensions are design
proportions, not venue measurements. Wood Table 001 texture is CC0 / Poly Haven.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import sys

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent


def material(name, color, roughness=0.5, metal=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metal
    return mat


def wood_material():
    mat = material("Warm varnished wood", (0.18, 0.065, 0.028), 0.32)
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(str(ROOT / "assets/wood-table-001-diffuse.jpg"), check_existing=True)
    shader = nodes.get("Principled BSDF")
    links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.18
    bump.inputs["Distance"].default_value = 0.007
    links.new(tex.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], shader.inputs["Normal"])
    return mat


def cube(name, location, dimensions, mat, bevel=0.02):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Soft furniture edges", "BEVEL")
        mod.width, mod.segments = bevel, 3
        obj.modifiers.new("Balanced normals", "WEIGHTED_NORMAL")
    return obj


def cylinder(name, location, radius, depth, mat):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    mod = obj.modifiers.new("Rounded rim", "BEVEL")
    mod.width, mod.segments = 0.009, 3
    obj.modifiers.new("Balanced normals", "WEIGHTED_NORMAL")
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    return obj


def chair(x, y, angle, frame, textile):
    parts = []
    for dx in [-0.175, 0.175]:
        for dy in [-0.17, 0.17]:
            parts.append(cube("Chair leg", (dx, dy, 0.21), (0.035, 0.035, 0.42), frame, 0.008))
    parts.append(cube("Seat frame", (0, 0, 0.43), (0.44, 0.44, 0.055), frame))
    parts.append(cube("Tailored seat cushion", (0, 0.018, 0.477), (0.41, 0.395, 0.065), textile, 0.03))
    for dx in [-0.185, 0.185]:
        parts.append(cube("Back post", (dx, -0.195, 0.69), (0.035, 0.04, 0.49), frame, 0.008))
    # A rounded, padded back gives a recognizable chair silhouette from overhead.
    parts.append(cube("Backrest timber", (0, -0.208, 0.85), (0.42, 0.045, 0.22), frame, 0.025))
    parts.append(cube("Backrest upholstery", (0, -0.176, 0.85), (0.35, 0.032, 0.17), textile, 0.018))
    for part in parts:
        px, py = part.location.x, part.location.y
        part.location.x = x + px * math.cos(angle) - py * math.sin(angle)
        part.location.y = y + px * math.sin(angle) + py * math.cos(angle)
        part.rotation_euler.z = angle


def seat_positions(shape, count, width, depth):
    if shape == "round":
        radius = width / 2 + 0.37
        return [(math.cos(i * math.tau / count) * radius,
                 math.sin(i * math.tau / count) * radius) for i in range(count)]
    if count == 2:
        return [(0, -depth / 2 - 0.37), (0, depth / 2 + 0.37)]
    slots = math.ceil((count - 2) / 2)
    return [(-width / 2 + (i // 2 + 0.5) * width / slots,
             (depth / 2 + 0.37) * (1 if i % 2 else -1)) for i in range(count - 2)] + [
        (-width / 2 - 0.37, 0), (width / 2 + 0.37, 0)]


def build(table, samples, size):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.render.resolution_x, scene.render.resolution_y = size, size * 3 // 4
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Soft studio environment")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs[0].default_value = (0.25, 0.22, 0.18, 1)
    scene.world.node_tree.nodes["Background"].inputs[1].default_value = 0.35

    count, shape = int(table["capacity_max"]), table["shape"]
    if shape == "round":
        width = depth = max(1.1, count * 0.225)
    elif shape == "joined":
        width, depth = 4.8, 1.05
    elif shape == "rect":
        width, depth = max(1.45, math.ceil((count - 2) / 2) * 0.62), 1.0
    else:
        width = depth = 0.9 if count == 2 else 1.1
    wood = wood_material()
    frame = material("Dark walnut frame", (0.07, 0.035, 0.02), 0.36)
    linen = material("Warm linen upholstery", (0.42, 0.34, 0.24), 0.85)
    nodes, links = linen.node_tree.nodes, linen.node_tree.links
    weave = nodes.new("ShaderNodeTexNoise")
    weave.inputs["Scale"].default_value = 180
    bump = nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value, bump.inputs["Distance"].default_value = 0.24, 0.003
    links.new(weave.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], nodes.get("Principled BSDF").inputs["Normal"])
    porcelain = material("Warm ivory ceramic", (0.73, 0.7, 0.63), 0.24)
    floor = material("Warm charcoal stone", (0.023, 0.018, 0.012), 0.78)
    cube("Floor", (0, 0, -0.045), (200, 200, 0.08), floor, 0)

    if shape == "round":
        cylinder("Round tabletop", (0, 0, 0.765), width / 2, 0.065, wood)
        cylinder("Pedestal", (0, 0, 0.36), 0.115, 0.72, frame)
        cylinder("Pedestal base", (0, 0, 0.045), width * 0.26, 0.08, frame)
    else:
        surfaces = [(-width / 4 - 0.012, width / 2 - 0.024), (width / 4 + 0.012, width / 2 - 0.024)] if shape == "joined" else [(0, width)]
        for center, tabletop_width in surfaces:
            cube("Tabletop", (center, 0, 0.765), (tabletop_width, depth, 0.065), wood, 0.03)
            cube("Table apron", (center, 0, 0.695), (tabletop_width - 0.16, depth - 0.16, 0.105), frame)
            for x in [center - tabletop_width / 2 + 0.12, center + tabletop_width / 2 - 0.12]:
                for y in [-depth / 2 + 0.12, depth / 2 - 0.12]:
                    cube("Table leg", (x, y, 0.35), (0.065, 0.065, 0.70), frame)

    positions = seat_positions(shape, count, width, depth)
    for x, y in positions:
        # Round seats face the center; straight rows face their nearest table edge.
        if shape == "round":
            angle = math.atan2(x, -y)
        elif abs(y) > depth / 2:
            angle = math.pi if y > 0 else 0
        else:
            angle = math.copysign(math.pi / 2, x)
        chair(x, y, angle, frame, linen)
        if shape == "round":
            scale = (width / 2 - 0.2) / math.hypot(x, y)
            px, py = x * scale, y * scale
        elif abs(y) > depth / 2:
            px, py = x, math.copysign(depth / 2 - 0.2, y)
        else:
            px, py = math.copysign(width / 2 - 0.2, x), 0
        cylinder("Place setting", (px, py, 0.81), 0.12, 0.018, porcelain)
        cylinder("Inner plate", (px, py, 0.824), 0.085, 0.01, porcelain)

    ceramic = material("Matte ceramic vase", (0.12, 0.13, 0.1), 0.7)
    cylinder("Table centerpiece", (0, 0, 0.87), 0.07, 0.14, ceramic)
    for location, energy, light_size in [((-3, -4, 6), 950, 5), ((3, 2, 5), 650, 4)]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.data.energy, light.data.shape, light.data.size = energy, "DISK", light_size
        light.rotation_euler = (Vector((0, 0, 0.4)) - light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.ops.object.camera_add(location=(0, -2.8, 8.5))
    camera = bpy.context.object
    camera.rotation_euler = (Vector((0, 0, 0.35)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = max((width + 1.8) * 1.14, (depth + 1.8) * 1.44)
    scene.camera = camera
    return {"code": table["code"], "shape": shape, "seats": count,
            "seat_positions": positions, "camera": "overhead with a slight tilt; prior top-view arrangement",
            "dimensions": "illustrative proportions, not measured venue dimensions"}


def main():
    args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Render one catalog code for art review")
    parser.add_argument("--samples", type=int, default=48)
    parser.add_argument("--size", type=int, default=960)
    options = parser.parse_args(args)
    inventory = json.loads((ROOT / "inventory.json").read_text())
    tables = inventory["tables"] + [{"code": "G1-G2", "shape": "joined", "capacity_max": 16}]
    if options.only:
        tables = [t for t in tables if t["code"] == options.only]
        if not tables:
            raise ValueError("Unknown table code")
    output = ROOT / "assets/seating"
    output.mkdir(exist_ok=True)
    manifest, rendered_layouts = [], {}
    for table in tables:
        path = output / (table["code"] + ".jpg")
        key = (table["shape"], int(table["capacity_max"]))
        if key in rendered_layouts:
            source, template = rendered_layouts[key]
            shutil.copy2(source, path)
            entry = {**template, "code": table["code"]}
        else:
            entry = build(table, options.samples, options.size)
            bpy.context.scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            rendered_layouts[key] = (path, dict(entry))
        entry.update(file=path.name, bytes=path.stat().st_size,
                     sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                     source="Original Blender scene / render_seating.py; CC0 Poly Haven wood texture",
                     renderer=bpy.app.version_string, samples=options.samples,
                     recipe_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
        manifest.append(entry)
        print("SEATING_RENDERED " + table["code"], flush=True)
    if not options.only:
        (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
