"""Felt: wool felt with fuzzy fibre noise and a sheen halo, hand-stitched seams, and a flat felt background."""
import math

import bmesh
import bpy
import subject as S

COLORS = {"wool": "#dcc39e", "belly": "#f6e8cf", "pink": "#e58aa5", "green": "#79ad63", "rock": "#9ba6b8", "stem": "#4a8a4d",
          "leaf": "#66b45c", "flower": "#f08c98", "wall": "#7cc0cc", "table": "#e0a58b", "timer": "#d95f50", "timer-text": "#fff2d4",
          "thread": "#fff4d6", "thread-gold": "#f4cf62", "eye": "#25201f"}


def felt(name, hex_, fuzz=1.0):
    """Principled with sheen, a colour mottle and two world-space noises (coarse clumps, fine fibres) driving a Bump node."""
    m = S.material(name, hex_, rough=0.95, Sheen_Weight=0.45 * fuzz, Sheen_Roughness=0.5, Specular_IOR_Level=0.1)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    pos = nt.nodes.new("ShaderNodeNewGeometry")
    coarse, fine, mottle = (nt.nodes.new("ShaderNodeTexNoise") for _ in range(3))
    for n, scale, detail in ((coarse, 28.0, 4.0), (fine, 140.0, 12.0), (mottle, 22.0, 3.0)):
        n.inputs["Scale"].default_value, n.inputs["Detail"].default_value = scale, detail
        nt.links.new(pos.outputs["Position"], n.inputs["Vector"])
    fine.inputs["Roughness"].default_value = 0.75
    mix = nt.nodes.new("ShaderNodeMath")
    mix.operation = "MULTIPLY"
    mix.inputs[1].default_value = 3.0
    nt.links.new(fine.outputs["Fac"], mix.inputs[0])
    sc = nt.nodes.new("ShaderNodeMath")
    sc.operation, sc.inputs[1].default_value = "MULTIPLY", 1.0
    nt.links.new(coarse.outputs["Fac"], sc.inputs[0])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    nt.links.new(mix.outputs[0], add.inputs[0])
    nt.links.new(sc.outputs[0], add.inputs[1])
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value, bump.inputs["Distance"].default_value = 1.0, 0.07
    nt.links.new(add.outputs[0], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    tint = nt.nodes.new("ShaderNodeMix")
    tint.data_type, tint.blend_type = "RGBA", "MULTIPLY"
    tint.inputs[0].default_value = 0.35
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color, ramp.color_ramp.elements[1].color = (0.7, 0.7, 0.7, 1), (1, 1, 1, 1)
    nt.links.new(mottle.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], tint.inputs[7])
    tint.inputs[6].default_value = S.hex_rgba(hex_)
    nt.links.new(tint.outputs[2], bsdf.inputs["Base Color"])
    return m


def stitches(name, mat, pts, length=0.1, width=0.022, height=0.02):
    """Thread dashes as small boxes. pts: [(position, tangent, normal)] in the parent's space; one mesh for the whole seam."""
    bm = bmesh.new()
    for p, t, n in pts:
        p, t, n = S.Vector(p), S.Vector(t).normalized(), S.Vector(n).normalized()
        b = t.cross(n).normalized()
        corners = [p + t * sx * length / 2 + b * sy * width / 2 + n * sz * height / 2
                   for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
        bm.verts.ensure_lookup_table()
        v = [bm.verts.new(c) for c in corners]
        for q in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
            bm.faces.new([v[i] for i in q])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(mat)
    ob = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def follow(ob, target):
    """Copy the target's animated location on top of this object's own, so the seam rides along with a bobbing slab."""
    c = ob.constraints.new("COPY_LOCATION")
    c.target, c.use_offset = target, True


def build(scene):
    c = COLORS
    f = lambda n, k, fz=1.0: felt(n, c[k], fz)
    mats = {"fur": f("fur", "wool"), "fur2": f("fur2", "belly"), "tail": f("tail", "belly", 1.3), "nose": f("nose", "pink"),
            "eye": S.material("eye", c["eye"], rough=0.2), "inner": f("inner", "pink"), "ground": f("ground", "green"),
            "rock": f("rock", "rock"), "stem": f("stem", "stem"), "leaf": f("leaf", "leaf"), "flower": f("flower", "flower"),
            "timer": f("timer", "timer"), "timer_text": f("timer_text", "timer-text")}
    S.set_world(scene, "#fff0e0", 0.2)
    parts = S.build_subject(mats, S.Opts(body=1.08, ears=0.95))
    for ob in list(bpy.data.objects):
        if ob.type == "MESH" and ob.name.split(".")[0] in ("torso", "belly", "skull", "ear", "foot", "paw", "tail", "rock", "rock2", "cheek"):
            ob.modifiers.new("puff", "SUBSURF").levels = 1
    thread, gold = S.material("thread", c["thread"], 0.9, Sheen_Weight=0.5), S.material("gold", c["thread-gold"], 0.9, Sheen_Weight=0.5)
    rig = parts["rig"]
    # belly seam, ear seams, a running stitch round the island and round the timer slab
    belly = [((0, -0.42 - 0.45 * math.sqrt(1 - ((z - 0.66) / 0.58) ** 2) - 0.03, z), (0, 0, 1), (0, -1, 0)) for z in [0.2 + 0.12 * i for i in range(8)]]
    S.parent_to(stitches("belly_seam", thread, belly), rig["body"])
    for ear in (rig["ear_l"], rig["ear_r"]):
        seam = [((0, -0.13, 0.2 + 0.14 * i), (0, 0, 1), (0, -1, 0)) for i in range(8)]
        S.parent_to(stitches("ear_seam", thread, seam, 0.08), ear)
    ring = [((2.95 * math.cos(a), 0.2 + 2.95 * math.sin(a), 0.012), (-math.sin(a), math.cos(a), 0), (0, 0, 1)) for a in [i * math.tau / 56 for i in range(56)]]
    stitches("island_seam", gold, ring, 0.2, 0.04, 0.03)
    # the slab seam is modelled around the slab's centre and follows its bobbing through a constraint
    top = [((x, -0.23, z), (1, 0, 0), (0, -1, 0)) for x in [-1.9 + 0.2 * i for i in range(20)] for z in (-0.62, 0.62)]
    side = [((sx * 1.92, -0.23, z), (0, 0, 1), (0, -1, 0)) for sx in (-1, 1) for z in [-0.4 + 0.2 * i for i in range(5)]]
    follow(stitches("slab_seam", thread, top + side, 0.12), parts["timer"]["slab"])
    S.wall(scene, f("wall", "wall"), y=6.5)
    S.table(scene, f("table", "table"), z=-0.5)
    key = S.add_light(scene, "AREA", "key", (-5, -7, 8), (0, 0, 0), 3800, "#ffe4c4", size=6.0)
    S.aim(key, (0, 0, 2.2))
    fill = S.add_light(scene, "AREA", "fill", (6, -6, 4), (0, 0, 0), 900, "#e4eeff", size=6.0)
    S.aim(fill, (0, 0, 2.2))
    S.add_camera(scene, target=(0, 0.3, 2.5), dist=13, lens=50, elev_deg=12)
    scene.eevee.taa_render_samples = 32
