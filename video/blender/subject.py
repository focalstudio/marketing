"""The shared neutral subject of every 3D demo: a sitting rabbit, a rock, a small plant, a ground patch and a big timer.

Z is up, the camera looks along +Y, the rabbit faces -Y. A style swaps materials (`mats`) and tweaks the build through
`Opts`: `maker` replaces how a body part is made (the voxel style makes cubes), `smooth`/`detail` set the facet count.
Animation is keyframed over frames 1-24: a small hop, breathing, an ear twitch and a head tilt; the timer counts down.
"""
import math
from dataclasses import dataclass, field

import bpy
from mathutils import Vector

ON_FRAME = []  # callbacks(frame) that render.py runs after frame_set


def hex_rgba(h, a=1.0):
    """sRGB hex string to the linear RGBA Blender wants."""
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c] + [a]


def material(name, hex_, rough=0.8, **inputs):
    """Plain Principled material; extra keyword inputs are set by socket name (underscores for spaces)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_rgba(hex_)
    bsdf.inputs["Roughness"].default_value = rough
    for k, v in inputs.items():
        bsdf.inputs[k.replace("_", " ")].default_value = v
    return m


def emission(name, hex_, strength=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out, em = nt.nodes.new("ShaderNodeOutputMaterial"), nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = hex_rgba(hex_)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


@dataclass
class Opts:
    detail: str = "smooth"   # "low" = ico sphere, flat facets; "smooth" = uv sphere, smooth shading
    maker: object = None     # maker(kind, name, loc, scale, mat, parent) -> object, replaces the default parts
    interp: str = "BEZIER"   # "CONSTANT" gives a stepped, stop-motion pose
    ears: float = 1.0        # ear length multiplier
    body: float = 1.0        # body roundness multiplier
    timer: str = "text"      # "text" = 3D font on a slab, "none" = a style draws its own
    timer_color_text: str = None
    extra: dict = field(default_factory=dict)


def parent_to(ob, parent):
    ob.parent = parent
    return ob


def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    return parent_to(e, parent) if parent else e


def make_part(opts, kind, name, loc, scale, mat, parent=None):
    """One primitive: kind is "sphere", "cube" or "cyl"; scale is the half-extent on each axis."""
    if opts.maker:
        return opts.maker(kind, name, loc, scale, mat, parent)
    if kind == "sphere" and opts.detail == "low":
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
    elif kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1)
    elif kind == "cyl":
        bpy.ops.mesh.primitive_cylinder_add(vertices=8 if opts.detail == "low" else 32, radius=1, depth=2)
    else:
        bpy.ops.mesh.primitive_cube_add(size=2)
    ob = bpy.context.active_object
    ob.name = name
    ob.location, ob.scale = loc, scale
    ob.data.materials.append(mat)
    if opts.detail == "low":
        ob.data.shade_flat()
    else:
        ob.data.shade_smooth()
    return parent_to(ob, parent) if parent else ob


def build_rabbit(mats, opts):
    """Returns the rig: root (hop), body (breathing), head (tilt), ear_l, ear_r (twitch)."""
    p = lambda *a, **k: make_part(opts, *a, **k)
    b, e = opts.body, opts.ears
    root = empty("rabbit", (0.1, 0, 0))
    root.rotation_euler.z = math.radians(-14)
    body = empty("body", (0, 0, 0), root)
    p("sphere", "torso", (0, 0, 0.78), (0.72 * b, 0.82 * b, 0.78 * b), mats["fur"], body)
    p("sphere", "belly", (0, -0.42, 0.66), (0.5, 0.45, 0.58), mats["fur2"], body)
    p("sphere", "tail", (0, 0.86, 0.62), (0.26, 0.26, 0.26), mats["tail"], body)
    for s in (-1, 1):
        p("sphere", "foot", (0.4 * s, -0.55, 0.16), (0.24, 0.46, 0.17), mats["fur"], body)
        p("sphere", "paw", (0.24 * s, -0.8, 0.5), (0.13, 0.18, 0.3), mats["fur"], body)
    head = empty("head", (0, -0.55, 1.62), root)
    p("sphere", "skull", (0, 0, 0.1), (0.52, 0.48, 0.46), mats["fur"], head)
    p("sphere", "nose", (0, -0.46, 0.0), (0.09, 0.07, 0.07), mats["nose"], head)
    p("sphere", "cheek", (0, -0.28, -0.1), (0.3, 0.26, 0.2), mats["fur2"], head)
    ears = []
    for s in (-1, 1):
        p("sphere", "eye", (0.2 * s, -0.4, 0.2), (0.08, 0.06, 0.1), mats["eye"], head)
        pivot = empty("ear", (0.24 * s, -0.02, 0.45), head)
        pivot.rotation_euler = (math.radians(-6), math.radians(14 * s), 0)
        p("sphere", "ear", (0, 0, 0.62 * e), (0.17, 0.1, 0.66 * e), mats["fur"], pivot)
        p("sphere", "inner", (0, -0.07, 0.6 * e), (0.1, 0.05, 0.5 * e), mats["inner"], pivot)
        ears.append(pivot)
    return {"root": root, "body": body, "head": head, "ear_l": ears[0], "ear_r": ears[1]}


def build_scene_props(mats, opts):
    """Ground patch, rock and plant. Returns {"ground", "rock", "plant"}."""
    p = lambda *a, **k: make_part(opts, *a, **k)
    ground = p("cyl", "ground", (0, 0.2, -0.25), (3.3, 3.3, 0.25), mats["ground"])
    rock = empty("rock", (-1.85, -0.3, 0))
    p("sphere", "rock", (0, 0, 0.3), (0.62, 0.5, 0.42), mats["rock"], rock)
    p("sphere", "rock2", (0.5, -0.2, 0.15), (0.34, 0.3, 0.22), mats["rock"], rock)
    plant = empty("plant", (1.9, -0.7, 0))
    p("cyl", "stem", (0, 0, 0.35), (0.05, 0.05, 0.36), mats["stem"], plant)
    for i in range(5):
        a = i * 2 * math.pi / 5
        leaf = empty("leafpivot", (0, 0, 0.55 + 0.06 * (i % 2)), plant)
        leaf.rotation_euler = (0, math.radians(-38), a)
        p("sphere", "leaf", (0.3, 0, 0), (0.3, 0.12, 0.05), mats["leaf"], leaf)
    p("sphere", "bud", (0, 0, 0.78), (0.11, 0.11, 0.11), mats["flower"], plant)
    return {"ground": ground, "rock": rock, "plant": plant}


def build_timer(mats, opts, loc=(0, 0.6, 5.5)):
    """A rounded slab with a 3D "25:00" in front; the text counts down in ON_FRAME."""
    slab = make_part(opts, "cube", "slab", loc, (2.15, 0.2, 0.85), mats["timer"])
    if opts.detail != "low" and not opts.maker:
        bev = slab.modifiers.new("round", "BEVEL")
        bev.width, bev.segments = 0.16, 5
        bev.limit_method = "NONE"
    curve = bpy.data.curves.new("timer_text", "FONT")
    curve.body, curve.size, curve.extrude, curve.bevel_depth = "25:00", 1.35, 0.06, 0.012
    curve.align_x, curve.align_y = "CENTER", "CENTER"
    if opts.detail == "low":
        curve.resolution_u, curve.bevel_depth = 1, 0
    text = bpy.data.objects.new("timer_digits", curve)
    text.location = (loc[0], loc[1] - 0.22, loc[2] - 0.02)
    text.rotation_euler = (math.pi / 2, 0, 0)
    text.data.materials.append(mats["timer_text"])
    bpy.context.scene.collection.objects.link(text)

    def set_time(frame):
        left = 1500 - (frame - 1) * 3
        curve.body = f"{left // 60:02d}:{left % 60:02d}"
    ON_FRAME.append(set_time)
    return {"slab": slab, "text": text, "curve": curve}


def animate(rig, opts, timer=None):
    """Keys over frames 1-24: hop (root z), breathing (body scale), head tilt, right ear twitch, timer bob."""
    prefs = bpy.context.preferences.edit
    prefs.keyframe_new_interpolation_type = opts.interp

    def key(ob, path, frames_values, index=-1):
        for f, v in frames_values:
            if index >= 0:
                cur = list(getattr(ob, path))
                cur[index] = v
                setattr(ob, path, cur)
            else:
                setattr(ob, path, v)
            ob.keyframe_insert(path, index=index, frame=f)

    root, body, head = rig["root"], rig["body"], rig["head"]
    key(root, "location", [(1, 0.0), (6, 0.1), (12, 0.55), (18, 0.1), (24, 0.0)], 2)
    key(body, "scale", [(1, 1.0), (12, 1.07), (24, 0.97)], 2)
    key(body, "scale", [(1, 1.0), (12, 0.97), (24, 1.03)], 0)
    if not opts.extra.get("grid"):  # a grid-aligned style (voxel) keeps its head straight
        key(head, "rotation_euler", [(1, 0.0), (12, math.radians(9)), (24, math.radians(-7))], 2)
        key(head, "rotation_euler", [(1, 0.0), (12, math.radians(-8)), (24, math.radians(4))], 0)
    ear = rig["ear_r"]
    base = ear.rotation_euler.y
    key(ear, "rotation_euler", [(1, base), (12, base + math.radians(10)), (20, base + math.radians(38)), (24, base)], 1)
    if timer:
        t0 = timer["slab"].location.z
        for ob in (timer["slab"], timer["text"]):
            dz = ob.location.z - t0
            key(ob, "location", [(1, t0 + dz), (12, t0 + dz + 0.14), (24, t0 + dz - 0.06)], 2)
    prefs.keyframe_new_interpolation_type = "BEZIER"


def build_subject(mats, opts=None):
    """The whole subject; returns a dict of the parts so a style can move or restyle them."""
    opts = opts or Opts()
    rig = build_rabbit(mats, opts)
    props = build_scene_props(mats, opts)
    timer = build_timer(mats, opts) if opts.timer == "text" else None
    animate(rig, opts, timer)
    return {"rig": rig, **props, "timer": timer}


def add_camera(scene, target=(0, 0, 2.9), dist=12.5, lens=50, elev_deg=8, name="cam"):
    cam = bpy.data.cameras.new(name)
    cam.lens = lens
    ob = bpy.data.objects.new(name, cam)
    e = math.radians(elev_deg)
    ob.location = (target[0], target[1] - dist * math.cos(e), target[2] + dist * math.sin(e))
    ob.rotation_euler = (math.pi / 2 - e, 0, 0)
    scene.collection.objects.link(ob)
    scene.camera = ob
    return ob


def add_light(scene, kind, name, loc, rot_deg, energy, color="#ffffff", **attrs):
    light = bpy.data.lights.new(name, kind)
    light.energy = energy
    light.color = hex_rgba(color)[:3]
    for k, v in attrs.items():
        setattr(light, k, v)
    ob = bpy.data.objects.new(name, light)
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot_deg]
    scene.collection.objects.link(ob)
    return ob


def set_world(scene, hex_, strength=1.0):
    world = bpy.data.worlds.new("world")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = hex_rgba(hex_)
    bg.inputs["Strength"].default_value = strength
    scene.world = world
    return world


def aim(ob, target=(0, 0, 2.0)):
    """Point a light or camera at a world position with a Track To constraint."""
    t = empty("aim_" + ob.name, target)
    c = ob.constraints.new("TRACK_TO")
    c.target, c.track_axis, c.up_axis = t, "TRACK_NEGATIVE_Z", "UP_Y"
    return ob


def wall(scene, mat, y=7.0, z=0.0, size=60):
    """A big vertical backdrop facing the camera."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, y, z), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.active_object
    ob.name = "wall"
    ob.data.materials.append(mat)
    return ob


def table(scene, mat, z=-0.5, size=60):
    """A big horizontal surface the scene sits on."""
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, z))
    ob = bpy.context.active_object
    ob.name = "table"
    ob.data.materials.append(mat)
    return ob
