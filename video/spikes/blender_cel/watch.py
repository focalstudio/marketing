"""Engine spike, Blender (EEVEE + Freestyle): the shared pocket-watch shot from watch_shot.json.

Run: Blender -b -P video/spikes/blender_cel/watch.py -- --out out/spikes/blender_cel/frames [--frames 15,70,105]

Builds the whole scene in bpy (no .blend committed) and writes one PNG per frame. The rabbit and the grain are added
afterwards by encode.sh, so they are ffmpeg's, not the scene's.
"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

RAD = math.pi / 180
ROOT = Path(__file__).resolve().parents[3]


def args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    out = {"out": "out/spikes/blender_cel/frames", "frames": None}
    for i, a in enumerate(argv):
        if a == "--out":
            out["out"] = argv[i + 1]
        elif a == "--frames":
            out["frames"] = [int(x) for x in argv[i + 1].split(",")]
    return out


SHOT = json.loads((ROOT / "video/spikes/watch_shot.json").read_text())
W, H, FPS = SHOT["w"], SHOT["h"], SHOT["fps"]
N = round(SHOT["duration"] * FPS)
PAL = SHOT["palette"]


# --- the camera and hands: the same formulas as zoomAt and secondAngle in watch_shot.mjs -------------------------------
def ease(x):
    return x * x * (3 - 2 * x)


def clamp01(x):
    return max(0.0, min(1.0, x))


def zoom_at(t):
    p = SHOT["push"]
    return p["zoom"][0] + (p["zoom"][1] - p["zoom"][0]) * ease(clamp01((t - p["from"]) / (p["to"] - p["from"])))


def second_angle(t):
    f = clamp01((t % 1) / SHOT["tick"]["dur"])
    return (math.floor(t) + ease(f) + 0.12 * math.sin(f * math.pi) * (1 - f)) * 6


def mulberry32(seed):
    a = seed & 0xFFFFFFFF

    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return r


# --- colour: palette hex in sRGB, inverted in sRGB for the flash, handed to nodes as linear --------------------------------
def srgb(hex_, flash):
    c = [int(hex_[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [1 - v if flash else v for v in c]
    return [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c] + [1.0]


APPLY = []  # callbacks(flash) that repaint a material


def new_material(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m, nt, em


def flat(name, key):
    m, nt, em = new_material(name)
    APPLY.append(lambda flash: setattr(em.inputs["Color"], "default_value", srgb(PAL[key], flash)))
    return m


def ramp(nt, em, src, below, above, edge):
    """Constant two-stop ramp: `below` under `edge`, `above` over it (the cel step)."""
    cr = nt.nodes.new("ShaderNodeValToRGB")
    cr.color_ramp.interpolation = "CONSTANT"
    cr.color_ramp.elements[0].position = 0.0
    cr.color_ramp.elements[1].position = edge
    nt.links.new(src, cr.inputs["Fac"])
    nt.links.new(cr.outputs["Color"], em.inputs["Color"])
    APPLY.append(lambda flash: (setattr(cr.color_ramp.elements[0], "color", srgb(PAL[below], flash)),
                                setattr(cr.color_ramp.elements[1], "color", srgb(PAL[above], flash))))


def cel(name, base, shade):
    """Toon material: N.L quantised to two tones, light fixed in world space as in the GL scene."""
    m, nt, em = new_material(name)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    dot = nt.nodes.new("ShaderNodeVectorMath")
    dot.operation = "DOT_PRODUCT"
    dot.inputs[1].default_value = Vector((-0.5, 0.6, 0.65)).normalized()
    nt.links.new(geo.outputs["Normal"], dot.inputs[0])
    ramp(nt, em, dot.outputs["Value"], shade, base, 0.35)  # below the step: shade
    return m


def face_mat(name, base, shade):
    """Face: the hard cel shadow is the face minus a circle shifted towards the light, in object coordinates."""
    m, nt, em = new_material(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    dist = nt.nodes.new("ShaderNodeVectorMath")
    dist.operation = "DISTANCE"
    dist.inputs[1].default_value = (SHOT["shadow"]["dx"], -SHOT["shadow"]["dy"], 0.0)
    nt.links.new(tc.outputs["Object"], dist.inputs[0])
    ramp(nt, em, dist.outputs["Value"], base, shade, 0.86)  # inside the shifted circle: lit
    return m


# --- geometry -------------------------------------------------------------------------------------------------------------
def poly(name, pts, z, mat, parent, coll):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x, y, z) for x, y in pts], [], [list(range(len(pts)))])
    me.update()
    return link(name, me, mat, parent, coll)


def link(name, me, mat, parent, coll):
    ob = bpy.data.objects.new(name, me)
    me.materials.append(mat)
    ob.parent = parent
    coll.objects.link(ob)
    return ob


def disc(name, r, z, mat, parent, coll, seg=96):
    return poly(name, [(math.cos(i / seg * 2 * math.pi) * r, math.sin(i / seg * 2 * math.pi) * r) for i in range(seg)], z, mat, parent, coll)


def case_wall(mat, parent, coll, r=1.0, z0=-0.12, z1=0.12, seg=96):
    verts, faces = [], []
    for i in range(seg):
        a = i / seg * 2 * math.pi
        verts += [(math.cos(a) * r, math.sin(a) * r, z0), (math.cos(a) * r, math.sin(a) * r, z1)]
    for i in range(seg):
        j = (i + 1) % seg
        faces.append([2 * i, 2 * j, 2 * j + 1, 2 * i + 1])
    faces.append([2 * i + 1 for i in range(seg)])  # front cap, the bezel
    me = bpy.data.meshes.new("case")
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = len(p.vertices) == 4
    return link("case", me, mat, parent, coll)


def hand(name, length, tail, w, z, mat, parent, coll):
    return poly(name, [(-w, -tail), (w, -tail), (w * 0.25, length), (-w * 0.25, length)], z, mat, parent, coll)


def build():
    scene = bpy.context.scene
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    watch = bpy.data.collections.new("watch")
    scene.collection.children.link(watch)
    bare = bpy.data.collections.new("bare")
    scene.collection.children.link(bare)
    over = bpy.data.collections.new("overlay")
    scene.collection.children.link(over)

    tilt = bpy.data.objects.new("tilt", None)
    tilt.rotation_mode = "YXZ"  # Y first, then X: the GL scene's rotX(-14) * rotY(10)
    tilt.rotation_euler = (-14 * RAD, 10 * RAD, 0)
    watch.objects.link(tilt)

    case = cel("case", "case", "shade")
    red, ink = flat("red", "red"), flat("ink", "ink")
    handmat = flat("hand", "case")
    ob = {}
    poly("crown", [(-0.14, 1.0), (0.14, 1.0), (0.14, 1.24), (-0.14, 1.24)], -0.02, case, tilt, watch)
    poly("crownCap", [(-0.14, 1.17), (0.14, 1.17), (0.14, 1.24), (-0.14, 1.24)], -0.01, red, tilt, watch)
    case_wall(case, tilt, watch)
    disc("face", 0.86, 0.13, face_mat("face", "face", "shade"), tilt, watch)
    for i in range(12):
        hw, y0 = (0.012, 0.73) if i % 3 else (0.022, 0.68)
        a = -i * 30 * RAD
        pts = [(-hw, y0), (hw, y0), (hw, 0.8), (-hw, 0.8)]
        poly(f"tick{i}", [(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)) for x, y in pts], 0.14, ink, tilt, bare)
    for name, deg, ln, tail, w, z in (("hour", SHOT["hands"]["hour"], 0.45, 0.07, 0.06, 0.15), ("minute", SHOT["hands"]["minute"], 0.7, 0.08, 0.04, 0.16)):
        h = hand(name, ln, tail, w, z, handmat, tilt, watch)
        h.rotation_euler.z = -deg * RAD
    ob["second"] = hand("second", 0.78, 0.18, 0.014, 0.17, red, tilt, bare)
    disc("hub", 0.05, 0.18, red, tilt, watch, seg=32)

    cam = bpy.data.cameras.new("cam")
    cam.sensor_fit = "VERTICAL"
    cam.angle = 24 * RAD
    cam.shift_y = -0.03  # the watch sits 47% down the frame: content up by 0.06 NDC
    cam.clip_start, cam.clip_end = 1, 40
    cob = bpy.data.objects.new("cam", cam)
    scene.collection.objects.link(cob)
    scene.camera = cob
    ob["cam"] = cob

    ob["over"], ob["tilt"] = over, tilt
    ob["lines_mat"] = flat("speed", "ink")

    world = bpy.data.worlds.new("paper")
    try:
        world.use_nodes = True
    except Exception:
        pass
    bg = world.node_tree.nodes["Background"]
    APPLY.append(lambda flash: setattr(bg.inputs["Color"], "default_value", srgb(PAL["paper"], flash)))
    scene.world = world

    r = scene.render
    r.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 32
    r.resolution_x, r.resolution_y, r.resolution_percentage = W, H, 100
    r.image_settings.file_format, r.image_settings.color_mode = "PNG", "RGB"
    r.use_file_extension = False
    scene.view_settings.view_transform, scene.view_settings.look = "Standard", "None"
    scene.display_settings.display_device = "sRGB"

    # tapered ink: Freestyle, thickest on edges facing the lower right
    r.use_freestyle = True
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    ls = vl.freestyle_settings.linesets[0] if vl.freestyle_settings.linesets else vl.freestyle_settings.linesets.new("ink")
    ls.select_silhouette = ls.select_border = ls.select_crease = True
    ls.select_by_collection = True
    ls.collection = watch
    style = bpy.data.linestyles.new("ink")
    style.thickness_position = "CENTER"
    mod = style.thickness_modifiers.new(name="taper", type="CALLIGRAPHY")
    mod.orientation = 135 * RAD
    mod.thickness_min, mod.thickness_max = 2.0, 12.0
    ls.linestyle = style
    ob["style"] = style
    return ob


def speed_lines(ob, flash_d, flash_zoom):
    """The shared 28 radial wedges, drawn on a plane 3 units in front of the watch, laid out in screen pixels."""
    over = ob["over"]
    for o in list(over.objects):
        bpy.data.objects.remove(o)
    r = mulberry32(SHOT["grain"]["seed"])
    tau = 2 * math.pi
    lines = [{"a": r() * tau, "w": 0.01 + r() * 0.035, "in": 0.5 + r() * 0.3} for _ in range(28)]
    z = 3.0
    dist = flash_d - z
    t = math.tan(12 * RAD)
    R, cx, cy = 360 * flash_zoom, W / 2, H * 0.47

    def world(px, py):
        return ((px / W * 2 - 1) * dist * t * (W / H), ((1 - py / H * 2) - 0.06) * dist * t, z)

    verts, faces = [], []
    for l in lines:
        r0 = R * l["in"] * 2
        i = len(verts)
        verts += [world(cx + math.cos(l["a"] - l["w"]) * r0, cy + math.sin(l["a"] - l["w"]) * r0),
                  world(cx + math.cos(l["a"]) * H, cy + math.sin(l["a"]) * H),
                  world(cx + math.cos(l["a"] + l["w"]) * r0, cy + math.sin(l["a"] + l["w"]) * r0)]
        faces.append([i, i + 1, i + 2])
    me = bpy.data.meshes.new("speed")
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new("speed", me)
    me.materials.append(ob["lines_mat"])
    over.objects.link(o)


def frame(ob, f):
    t = f / FPS
    flash = f in SHOT["flash"]["frames"]
    zoom = zoom_at(t) * (1.05 if flash else 1)
    d = 12.54 / zoom
    ob["cam"].location = (0, 0, d)
    ob["second"].rotation_euler.z = -second_angle(t) * RAD
    for fn in APPLY:
        fn(flash)
    ob["style"].color = srgb(PAL["ink"], flash)[:3]
    ob["style"].thickness = 1.0
    for o in list(ob["over"].objects):
        bpy.data.objects.remove(o)
    if flash:
        speed_lines(ob, d, zoom)


def main():
    a = args()
    ob = build()
    out = Path(a["out"])
    out.mkdir(parents=True, exist_ok=True)
    for f in a["frames"] if a["frames"] is not None else range(N):
        frame(ob, f)
        bpy.context.scene.render.filepath = str(out / f"{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"frame {f}/{N}", flush=True)


main()
