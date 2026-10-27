"""Voxel: the rabbit, the world and even the timer digits are built from cubes on a grid, lit like a block game."""
import math
import random

import bpy
import subject as S

G = 0.15   # rabbit voxel size
W = 0.3    # world voxel size
COUNT = [0]
DIRS = [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)]
FACES = [((1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)), ((-1, -1, -1), (-1, -1, 1), (-1, 1, 1), (-1, 1, -1)),
         ((-1, 1, -1), (-1, 1, 1), (1, 1, 1), (1, 1, -1)), ((-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)),
         ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1)), ((-1, -1, -1), (-1, 1, -1), (1, 1, -1), (1, -1, -1))]
FONT = {"0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111",
        "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001010010010",
        "8": "111101111101111", "9": "111101111001111", ":": "000010000010000"}
COLORS = {"sky": "#8fd3f4", "grass": "#6cc24a", "grass2": "#5bb040", "dirt": "#9a6b43", "fur": "#ece4d9", "fur-shade": "#d3c6b8",
          "pink": "#f08aa4", "eye": "#2a2430", "stone": "#8e949c", "trunk": "#7a5233", "leaf": "#3f9a3a", "flower": "#ff6b8a",
          "timer": "#3a3f4d", "timer-text": "#ffd84a", "cloud": "#ffffff"}


def voxel_mesh(name, cells, mats, g, loc=(0, 0, 0), parent=None):
    """One object from {(i, j, k): material index}, with only the faces that face the air."""
    verts, faces, idx = [], [], []
    for (i, j, k), m in cells.items():
        for d, quad in zip(DIRS, FACES):
            if (i + d[0], j + d[1], k + d[2]) in cells:
                continue
            base = len(verts)
            verts += [((i + 0.5 * q[0]) * g, (j + 0.5 * q[1]) * g, (k + 0.5 * q[2]) * g) for q in quad]
            faces.append((base, base + 1, base + 2, base + 3))
            idx.append(m)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    for m in mats:
        mesh.materials.append(m)
    mesh.polygons.foreach_set("material_index", idx)
    mesh.shade_flat()
    ob = bpy.data.objects.new(name, mesh)
    ob.location = loc
    bpy.context.scene.collection.objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


def rabbit_maker(kind, name, loc, scale, mat, parent):
    g = G / 2 if name in ("eye", "nose") else G  # the face details use half-size cubes so they can sit on the surface
    scale = [max(s - 0.3 * g, 0.01) for s in scale]  # fit the cubes inside the ellipsoid, not around it
    if name == "ear":
        scale[0] = 1.2 * G  # three cubes wide, so the white shows around the pink
    n = [int(s / g + 0.5) for s in scale]
    cells = {}
    for i in range(-n[0], n[0] + 1):
        for j in range(-n[1], n[1] + 1):
            for k in range(-n[2], n[2] + 1):
                r = (i * g / scale[0]) ** 2 + (j * g / scale[1]) ** 2 + (k * g / scale[2]) ** 2
                if (i, j, k) == (0, 0, 0) or r <= 1.0:
                    cells[(i, j, k)] = 0
    loc = [round(v / g) * g for v in loc]
    if g != G:
        loc[1] -= 0.5 * G * 0.5
    ob = voxel_mesh(name, cells, [mat], g, tuple(loc), parent)
    COUNT[0] += 1
    ob.scale = [1 + 0.004 * COUNT[0]] * 3  # keeps coplanar faces of overlapping parts from z-fighting
    return ob


def world(mats, rng):
    """Grass blocks over dirt in a disc, a few trees, a stone pile, a sapling and blocky clouds."""
    grass, dirt = {}, {}
    R = 11
    for i in range(-R, R + 1):
        for j in range(-R, R + 1):
            if i * i + j * j <= R * R:
                grass[(i, j, -1)] = 1 if (i * 7 + j * 13) % 5 else 2
                dirt[(i, j, -2)] = 3
                dirt[(i, j, -3)] = 3
    cells = {**{k: v - 1 for k, v in grass.items()}, **{k: 2 for k in dirt}}
    mat_list = [mats["grass"], mats["grass2"], mats["dirt"]]
    voxel_mesh("ground", cells, mat_list, W, (0, 0.2, 0))
    for tx, ty, h in [(-9, 7, 4), (9, 6, 5), (-5, 12, 5), (6, 14, 4)]:
        c = {(0, 0, k): 0 for k in range(h)}
        for dx in range(-2, 3):
            for dy in range(-2, 3):
                for dz in range(h, h + 3):
                    if abs(dx) + abs(dy) + (dz - h) <= 4 and (dx, dy, dz) != (0, 0, h):
                        c[(dx, dy, dz)] = 1
        voxel_mesh("tree", c, [mats["trunk"], mats["leaf"]], W, (tx * W, ty * W, 0))
    clouds = {}
    for cx, cz in [(-14, 24), (16, 30)]:
        for dx in range(5):
            for dy in range(3):
                clouds[(cx + dx, 20 + dy, cz + (dx % 2))] = 0
    voxel_mesh("clouds", clouds, [mats["cloud"]], 0.6, (0, 0, 0))


def build(scene):
    c = COLORS
    m = lambda n, k, rough=0.9: S.material(n, c[k], rough=rough)
    mats = {"fur": m("fur", "fur"), "fur2": m("fur2", "fur-shade"), "tail": m("tail", "cloud"), "nose": m("nose", "pink"),
            "eye": m("eye", "eye"), "inner": m("inner", "pink"), "rock": m("rock", "stone"), "stem": m("stem", "leaf"),
            "leaf": m("leaf", "leaf"), "flower": m("flower", "flower"), "grass": m("grass", "grass"),
            "grass2": m("grass2", "grass2"), "dirt": m("dirt", "dirt"), "trunk": m("trunk", "trunk"), "cloud": m("cloud", "cloud"),
            "timer": m("timer", "timer"), "timer_text": S.emission("timer_text", c["timer-text"], 1.0)}
    S.set_world(scene, c["sky"], 0.9)
    opts = S.Opts(detail="low", maker=rabbit_maker, interp="CONSTANT", timer="none", extra={"grid": True})
    rig = S.build_rabbit(mats, opts)
    rig["root"].rotation_euler.z = 0
    for key in ("body", "head"):
        rig[key].location = [round(v / G) * G for v in rig[key].location]
    for ear in ("ear_l", "ear_r"):
        rig[ear].location = [round(v / G) * G for v in rig[ear].location]
        rig[ear].rotation_euler = (0, 0, 0)
    world(mats, random.Random(3))
    # rock and sapling as voxel piles on the world grid
    rock = {(i, j, k): 0 for i in range(-2, 3) for j in range(-1, 2) for k in range(0, 2 if abs(i) == 2 else 3)}
    voxel_mesh("rock", rock, [mats["rock"]], W, (-1.8, -0.3, 0.15))
    sap = {(0, 0, 0): 0, (0, 0, 1): 0, (1, 0, 2): 1, (-1, 0, 2): 1, (0, 1, 2): 1, (0, -1, 2): 1, (0, 0, 3): 2}
    voxel_mesh("plant", sap, [mats["stem"], mats["leaf"], mats["flower"]], 0.2, (1.9, -0.7, 0.1))
    # the timer: a dark slab of cubes with raised digits that are rebuilt per frame
    slab = voxel_mesh("slab", {(i, 0, k): 0 for i in range(-11, 12) for k in range(-4, 5)}, [mats["timer"]], 0.2, (0, 0.6, 5.5))
    digits = voxel_mesh("digits", {(0, 0, 0): 0}, [mats["timer_text"]], 0.2, (0, 0.34, 5.5))

    def set_time(frame):
        left = 1500 - (frame - 1) * 3
        text, cells, x = f"{left // 60:02d}:{left % 60:02d}", {}, 0
        total = sum(2 if ch == ":" else 4 for ch in text) - 1
        x = -total // 2
        for ch in text:
            w = 1 if ch == ":" else 3
            for n, bit in enumerate(FONT[ch]):
                if bit == "1":
                    cells[(x + (n % 3 if w == 3 else 0) , 0, 2 - n // 3)] = 0
            x += w + 1
        fresh = voxel_mesh("tmp", cells, [mats["timer_text"]], 0.2)
        digits.data, old = fresh.data, digits.data
        bpy.data.objects.remove(fresh)
        bpy.data.meshes.remove(old)
    S.ON_FRAME.append(set_time)
    S.animate(rig, opts, {"slab": slab, "text": digits})
    S.add_light(scene, "SUN", "sun", (0, 0, 8), (60, 0, -28), 3.4, "#fff1d6", angle=math.radians(6))
    S.add_light(scene, "SUN", "fill", (0, 0, 8), (68, 0, 150), 0.5, "#cfe6ff")
    S.add_camera(scene, target=(0, 0.3, 2.5), dist=13, lens=50, elev_deg=14)
    scene.eevee.taa_render_samples = 16
