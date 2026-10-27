"""Diorama: a toy-sized scene on a wooden base and table, shot low with a huge aperture so the depth of field is razor thin."""
import math
import random

import bpy
import subject as S

COLORS = {"table": "#7a4e32", "base": "#c98d52", "grass": "#6fc044", "fur": "#f6efe4", "fur-shade": "#f1d9cf", "pink": "#ef6f8e",
          "rock": "#a6a9b8", "stem": "#3f9a3b", "leaf": "#4fc24a", "flower": "#ff5d86", "timer": "#2f6fd0", "timer-text": "#fff3c2",
          "trunk": "#8a5a36", "pine": "#2f8f4a", "fence": "#f1e3c8", "wall": "#2a1c1c", "lamp": "#ffd38a", "eye": "#1f1a1c"}


def toy(name, hex_, rough=0.32):
    """Glossy moulded plastic."""
    return S.material(name, hex_, rough=rough, Specular_IOR_Level=0.7, Coat_Weight=0.25, Coat_Roughness=0.2)


def build(scene):
    c = COLORS
    t = lambda n, k, r=0.32: toy(n, c[k], r)
    mats = {"fur": t("fur", "fur", 0.4), "fur2": t("fur2", "fur-shade", 0.4), "tail": t("tail", "fur"), "nose": t("nose", "pink"),
            "eye": t("eye", "eye", 0.1), "inner": t("inner", "pink"), "ground": t("ground", "grass", 0.6), "rock": t("rock", "rock", 0.5),
            "stem": t("stem", "stem"), "leaf": t("leaf", "leaf"), "flower": t("flower", "flower"), "timer": t("timer", "timer"),
            "timer_text": t("timer_text", "timer-text", 0.3)}
    S.set_world(scene, "#201410", 0.15)
    parts = S.build_subject(mats, S.Opts(body=1.05))
    wood = toy("wood", c["base"], 0.5)
    base = S.make_part(S.Opts(), "cyl", "base", (0, 0.2, -0.65), (3.55, 3.55, 0.3), wood)
    bev = base.modifiers.new("round", "BEVEL")
    bev.width, bev.segments = 0.07, 3
    S.table(scene, toy("table", c["table"], 0.4), z=-0.95)
    rng = random.Random(11)
    # toy trees and a picket fence on the back half of the base
    for i, a in enumerate([40, 75, 110, 145]):
        r, h = 2.85, rng.uniform(0.9, 1.3)
        x, y = r * math.cos(math.radians(a)), 0.2 + r * math.sin(math.radians(a))
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.07, depth=0.5, location=(x, y, 0.25))
        bpy.context.active_object.data.materials.append(t("trunk", "trunk"))
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.45, radius2=0.02, depth=h, location=(x, y, 0.5 + h / 2))
        bpy.context.active_object.data.materials.append(t("pine", "pine"))
        bpy.context.active_object.data.shade_smooth()
    for i in range(7):
        a = math.radians(-70 + i * 11)
        x, y = 3.0 * math.cos(a), 0.2 + 3.0 * math.sin(a) * 0.6 + 0.6
        S.make_part(S.Opts(), "cube", "fence", (x, y + 1.0, 0.28), (0.07, 0.04, 0.28), t("fence", "fence", 0.5))
    # a dark room behind with out-of-focus lamps: they become the soft discs of bokeh
    S.wall(scene, S.material("wall", c["wall"], 0.9), y=26)
    lamp = S.emission("lamp", c["lamp"], 60.0)
    for i in range(28):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.12, location=(rng.uniform(-8, 8), rng.uniform(14, 22), rng.uniform(-0.5, 9)))
        bpy.context.active_object.data.materials.append(lamp)
    S.add_light(scene, "AREA", "key", (-5, -9, 8), (0, 0, 0), 4500, "#ffd9a8", size=4.0)
    S.aim(bpy.data.objects["key"], (0, 0, 2))
    S.add_light(scene, "AREA", "rim", (5, 6, 6), (0, 0, 0), 1500, "#9ec4ff", size=4.0)
    S.aim(bpy.data.objects["rim"], (0, 0, 2))
    cam = S.add_camera(scene, target=(0, 0.3, 2.3), dist=13, lens=50, elev_deg=5)
    cam.data.dof.use_dof, cam.data.dof.aperture_fstop = True, 0.11
    cam.data.dof.focus_distance = 13.0
    scene.eevee.taa_render_samples = 32
