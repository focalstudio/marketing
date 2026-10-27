"""Toon 3D: cel-shaded materials (Shader to RGB into a three-band constant ramp) and a Freestyle ink outline."""
import math

import bpy
import subject as S

COLORS = {"ink": "#2b1d3a", "sky": "#ffe7a3", "grass": "#86d36a", "grass-shade": "#3f9e6a", "fur": "#fff4ea", "fur-shade": "#b9a6e6",
          "pink": "#ff7fa3", "pink-shade": "#c9468a", "rock": "#9db4e8", "rock-shade": "#5a6bb8", "leaf": "#5ed07a", "leaf-shade": "#2a8a6a",
          "timer": "#ff8a5b", "timer-shade": "#d2455e", "timer-text": "#fff8e6", "wall": "#7fd6ff", "wall-shade": "#4a9be0", "eye": "#2b1d3a"}


def mix(a, b, t):
    ca, cb = S.hex_rgba(a), S.hex_rgba(b)
    return [x + (y - x) * t for x, y in zip(ca, cb)]


def toon(name, base, shade, bands=3):
    """Diffuse -> Shader to RGB -> constant ramp: shade / base / lit band, output as pure emission so no shading leaks in."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out, em = nt.nodes.new("ShaderNodeOutputMaterial"), nt.nodes.new("ShaderNodeEmission")
    diff, s2r, ramp = nt.nodes.new("ShaderNodeBsdfDiffuse"), nt.nodes.new("ShaderNodeShaderToRGB"), nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "CONSTANT"
    els = ramp.color_ramp.elements
    els[0].position, els[0].color = 0.0, S.hex_rgba(shade)
    els[1].position, els[1].color = 0.42, S.hex_rgba(base)
    if bands == 3:
        e = els.new(0.72)
        e.color = mix(base, "#ffffff", 0.45)
    nt.links.new(diff.outputs["BSDF"], s2r.inputs["Shader"])
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], em.inputs["Color"])
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return m


def ink(scene, color, px=4.5):
    """Freestyle line set: silhouettes, borders and creases in one dark ink colour."""
    scene.render.use_freestyle = True
    scene.render.line_thickness_mode, scene.render.line_thickness = "ABSOLUTE", px
    vl = scene.view_layers[0]
    vl.use_freestyle = True
    fs = vl.freestyle_settings
    ls = fs.linesets[0] if fs.linesets else fs.linesets.new("ink")
    ls.select_silhouette = ls.select_border = ls.select_crease = True
    ls.select_by_visibility = True
    fs.crease_angle = math.radians(100)
    style = bpy.data.linestyles.new("ink")
    style.color = S.hex_rgba(color)[:3]
    style.thickness = px
    ls.linestyle = style


def build(scene):
    c = COLORS
    t = lambda n, b, s, **k: toon(n, c[b], c[s], **k)
    mats = {
        "fur": t("fur", "fur", "fur-shade"), "fur2": t("fur2", "fur", "fur-shade"), "tail": t("tail", "fur", "fur-shade"),
        "nose": t("nose", "pink", "pink-shade", bands=2), "eye": t("eye", "eye", "eye", bands=2), "inner": t("inner", "pink", "pink-shade"),
        "ground": t("ground", "grass", "grass-shade"), "rock": t("rock", "rock", "rock-shade"), "stem": t("stem", "leaf", "leaf-shade"),
        "leaf": t("leaf", "leaf", "leaf-shade"), "flower": t("flower", "pink", "pink-shade"), "timer": t("timer", "timer", "timer-shade"),
        "timer_text": S.emission("timer_text", c["timer-text"]),
    }
    ink(scene, c["ink"])
    S.set_world(scene, c["sky"], 0.3)
    parts = S.build_subject(mats, S.Opts(body=1.05))
    S.wall(scene, S.emission("wall", c["wall"]), y=7.0)
    S.table(scene, S.emission("table", c["grass-shade"]), z=-0.5)
    # the digits stay clean: a collection the ink line set leaves out
    plain = bpy.data.collections.new("plain")
    scene.collection.children.link(plain)
    scene.collection.objects.unlink(parts["timer"]["text"])
    plain.objects.link(parts["timer"]["text"])
    ls = scene.view_layers[0].freestyle_settings.linesets[0]
    ls.select_by_collection, ls.collection, ls.collection_negation = True, plain, "EXCLUSIVE"
    S.add_light(scene, "SUN", "sun", (0, 0, 8), (50, 10, -38), 2.4, "#ffffff", angle=math.radians(1))
    S.add_camera(scene, target=(0, 0.3, 2.5), dist=13, lens=50, elev_deg=12)
    scene.eevee.taa_render_samples = 16
