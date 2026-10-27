"""Blender engine for the 3D style demos (EEVEE, headless, no .blend files, no assets).

Run: blender -b --factory-startup -P video/blender/render.py -- <style-id> <outdir> <frames>
  style-id  hyphenated style id; the module is video/blender/styles/<id with underscores>.py and exposes build(scene)
  outdir    where <frame:04d>.png files are written
  frames    comma-separated frame numbers inside 1-24, e.g. 1,12,24

The scene is 1080x1920 (9:16), 24 fps. Everything is built in code and seeded, so two runs give the same pixels.
"""
import importlib
import sys
from pathlib import Path

import bpy

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

W, H, FPS = 1080, 1920, 24


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    if len(argv) != 3:
        raise SystemExit("usage: blender -b --factory-startup -P render.py -- <style-id> <outdir> <frames>")
    return argv[0], Path(argv[1]), [int(f) for f in argv[2].split(",") if f.strip()]


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for item in list(coll):
            coll.remove(item)
    return scene


def base_settings(scene):
    r = scene.render
    r.engine = "BLENDER_EEVEE"  # the id in Blender 4.2+ is BLENDER_EEVEE_NEXT, in 5.x it is BLENDER_EEVEE again
    r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
    r.fps, r.fps_base = FPS, 1
    r.image_settings.file_format, r.image_settings.color_mode = "PNG", "RGB"
    r.use_file_extension = False
    r.film_transparent = False
    scene.frame_start, scene.frame_end = 1, 24
    scene.eevee.taa_render_samples = 24
    scene.eevee.use_fast_gi = False  # screen-space GI off: cheaper and cleaner on flat-shaded cubes
    scene.view_settings.view_transform, scene.view_settings.look = "Standard", "None"
    scene.display_settings.display_device = "sRGB"


def main():
    style_id, outdir, frames = parse_args()
    outdir.mkdir(parents=True, exist_ok=True)
    scene = clear_scene()
    base_settings(scene)
    module = importlib.import_module("styles." + style_id.replace("-", "_"))
    module.build(scene)
    import subject  # after build, so its per-frame hooks are registered
    for frame in frames:
        scene.frame_set(frame)
        for hook in subject.ON_FRAME:
            hook(frame)
        bpy.context.view_layer.update()
        scene.render.filepath = str(outdir / f"{frame:04d}.png")
        bpy.ops.render.render(write_still=True)


main()
