"""Claymation: soft plasticine with fingerprint bumps, a little subsurface glow, a warm key light and a stepped pose."""
import math

import bpy
import subject as S

COLORS = {"clay-rabbit": "#e8c2b2", "clay-belly": "#f6e2d3", "clay-pink": "#e9788f", "clay-green": "#7dbb6a", "clay-rock": "#8c9fb8",
          "clay-leaf": "#4f9f58", "clay-yellow": "#f2c04d", "clay-wall": "#8fc1ea", "clay-table": "#e49a8d", "clay-text": "#b4432d",
          "eye": "#2b2230", "key": "#ffcf99"}


def clay(name, hex_, bump=0.9):
    """Principled matte clay: soft subsurface, a ridged fingerprint wave and fine noise driving one Bump node."""
    m = S.material(name, hex_, rough=0.62, Subsurface_Weight=0.2, Subsurface_Scale=0.25, Specular_IOR_Level=0.15)
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.45, 0.3)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.wave_type, wave.bands_direction, wave.wave_profile = "RINGS", "X", "SIN"
    wave.inputs["Scale"].default_value, wave.inputs["Distortion"].default_value = 38.0, 6.0
    wave.inputs["Detail"].default_value, wave.inputs["Detail Scale"].default_value = 3.0, 1.5
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value, noise.inputs["Detail"].default_value = 40.0, 6.0
    mix = nt.nodes.new("ShaderNodeMath")
    mix.operation, mix.inputs[1].default_value = "ADD", 0.0
    nt.links.new(coord.outputs["Object"], wave.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], mix.inputs[0])
    n2 = nt.nodes.new("ShaderNodeMath")
    n2.operation, n2.inputs[1].default_value = "MULTIPLY", 0.6
    nt.links.new(noise.outputs["Fac"], n2.inputs[0])
    add = nt.nodes.new("ShaderNodeMath")
    add.operation = "ADD"
    nt.links.new(mix.outputs[0], add.inputs[0])
    nt.links.new(n2.outputs[0], add.inputs[1])
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value, b.inputs["Distance"].default_value = bump, 0.04
    nt.links.new(add.outputs[0], b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def lumpy(ob, seed):
    """Hand-squeezed lumps: a low-frequency displace, so no two parts are perfect ellipsoids."""
    tex = bpy.data.textures.new(f"lump{seed}", "CLOUDS")
    tex.noise_scale, tex.noise_depth = 0.7, 1
    ob.modifiers.new("smooth", "SUBSURF").levels = 2
    d = ob.modifiers.new("lump", "DISPLACE")
    d.texture, d.strength, d.mid_level = tex, 0.13, 0.5
    d.texture_coords = "LOCAL"


def build(scene):
    c = COLORS
    mats = {
        "fur": clay("fur", c["clay-rabbit"]), "fur2": clay("fur2", c["clay-belly"]), "tail": clay("tail", c["clay-belly"]),
        "nose": clay("nose", c["clay-pink"]), "eye": S.material("eye", c["eye"], rough=0.15), "inner": clay("inner", c["clay-pink"]),
        "ground": clay("ground", c["clay-green"], 0.6), "rock": clay("rock", c["clay-rock"]), "stem": clay("stem", c["clay-leaf"]),
        "leaf": clay("leaf", c["clay-leaf"]), "flower": clay("flower", c["clay-pink"]), "timer": clay("timer", c["clay-yellow"], 0.6),
        "timer_text": clay("timer_text", c["clay-text"], 0.25),
    }
    S.set_world(scene, "#f6dcc8", 0.3)
    S.build_subject(mats, S.Opts(interp="CONSTANT", body=1.08))
    for i, ob in enumerate(o for o in bpy.data.objects if o.type == "MESH" and o.name.split(".")[0] not in ("ground", "slab", "eye", "stem")):
        lumpy(ob, i)
    S.wall(scene, clay("wall", c["clay-wall"], 0.2), y=6.5)
    S.table(scene, clay("table", c["clay-table"], 0.3))
    key = S.add_light(scene, "AREA", "key", (-5, -7, 8), (0, 0, 0), 3200, c["key"], size=5.0)
    S.aim(key, (0, 0, 2.2))
    fill = S.add_light(scene, "AREA", "fill", (6, -6, 4), (0, 0, 0), 500, "#ffe9dc", size=6.0)
    S.aim(fill, (0, 0, 2.2))
    S.add_camera(scene, target=(0, 0.3, 2.5), dist=13, lens=50, elev_deg=12)
    scene.eevee.taa_render_samples = 32
