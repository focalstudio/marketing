"""Low-poly 3D: real faceted geometry, flat shading, one golden sun, pastel greens on a floating island."""
import math
import random

import bpy
import subject as S

COLORS = {
    "sky": "#fbe3c8", "grass": "#9fd18b", "grass-dark": "#6fb47a", "fur": "#f6e9df", "fur-shade": "#f0d3cc",
    "ear-inner": "#f2a7b5", "rock": "#b9b4c9", "stem": "#5fa070", "leaf": "#7cc58a", "flower": "#f6a5c0",
    "sun": "#ffd9a0", "mountain": "#9db4de", "timer": "#8fcf9c", "timer-text": "#fff8e8", "eye": "#3a3347",
}


def lowpoly_material(name, hex_):
    return S.material(name, hex_, rough=0.9, Specular_IOR_Level=0.0)


def build(scene):
    c = COLORS
    mats = {
        "fur": lowpoly_material("fur", c["fur"]), "fur2": lowpoly_material("fur2", c["fur-shade"]),
        "tail": lowpoly_material("tail", "#ffffff"), "nose": lowpoly_material("nose", c["ear-inner"]),
        "eye": lowpoly_material("eye", c["eye"]), "inner": lowpoly_material("inner", c["ear-inner"]),
        "ground": lowpoly_material("ground", c["grass"]), "rock": lowpoly_material("rock", c["rock"]),
        "stem": lowpoly_material("stem", c["stem"]), "leaf": lowpoly_material("leaf", c["leaf"]),
        "flower": lowpoly_material("flower", c["flower"]), "timer": lowpoly_material("timer", c["timer"]),
        "timer_text": lowpoly_material("timer_text", c["timer-text"]),
    }
    S.set_world(scene, c["sky"], 0.9)
    opts = S.Opts(detail="low", ears=1.05)
    S.build_subject(mats, opts)
    # a faceted rim under the island, a ring of pine cones and far mountains: all low-poly primitives
    rng = random.Random(7)
    rim = S.make_part(opts, "cyl", "rim", (0, 0.2, -0.85), (3.0, 3.0, 0.4), lowpoly_material("rim", c["grass-dark"]))
    rim.scale = (3.15, 3.15, 0.45)
    bpy.ops.mesh.primitive_cone_add(vertices=6, radius1=3.0, radius2=1.4, depth=2.2, location=(0, 0.2, -2.1))
    bpy.context.active_object.data.materials.append(lowpoly_material("under", "#8f7a6a"))
    for i in range(6):
        a = math.radians(15 + i * 30 + rng.uniform(-6, 6))
        r = rng.uniform(2.3, 2.8)
        s = rng.uniform(0.35, 0.55)
        bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=s, radius2=0, depth=s * 3, location=(r * math.cos(a), 0.2 + r * math.sin(a) * 0.9, s * 1.5))
        bpy.context.active_object.data.materials.append(lowpoly_material("pine", c["grass-dark"]))
    for i, (x, y, s) in enumerate([(-6, 16, 5), (5, 18, 6), (0, 24, 7)]):
        bpy.ops.mesh.primitive_cone_add(vertices=5, radius1=s, radius2=0, depth=s * 1.1, location=(x, y, s * 0.5 - 1.5))
        bpy.context.active_object.data.materials.append(lowpoly_material("mount", ["#a9b8e2", "#c3add8", "#b4cfe0"][i]))
    for ob in bpy.data.objects:
        if ob.type == "MESH" and ob.name.startswith("Cone"):
            ob.data.shade_flat()
    S.add_light(scene, "SUN", "sun", (0, 0, 8), (55, 0, -48), 3.1, c["sun"], angle=math.radians(4))
    S.add_light(scene, "SUN", "fill", (0, 0, 8), (70, 0, 140), 0.8, "#c9d8ff")
    S.add_camera(scene, target=(0, 0.3, 2.5), dist=13, lens=50, elev_deg=14)
    scene.eevee.taa_render_samples = 16
