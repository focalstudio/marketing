"""Timeline, render loop, preview and ffmpeg pipe. Knows clips and styles only through their interfaces.

A clip (video/clips/<name>.py) is data: BOARD = {dur, audio, scenes: [...]} plus OVERRIDES = {style: {scene: patch}}.
A style (video/styles/<name>.py) exposes Style, a subclass of video.styles.base.Style.
"""
import copy, importlib, os, subprocess, tempfile, time
from multiprocessing import Pool

from .audio import make_audio
from PIL import Image

from .ease import clamp, ease_io, prog

W, H, FPS = 1080, 1920, 30


def merge(base, patch):
    """Deep-merge dicts; anything else in patch (lists, tuples, numbers) replaces the base value."""
    out = copy.deepcopy(base)
    for k, v in patch.items():
        out[k] = merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else copy.deepcopy(v)
    return out


def load(clip, style):
    """-> (board with the style's overrides applied, style instance)"""
    c = importlib.import_module(f"video.clips.{clip}")
    sty = importlib.import_module(f"video.styles.{style}").Style()
    ov = c.OVERRIDES.get(style, {})
    board = dict(c.BOARD, scenes=[merge(sc, ov.get(sc["name"], {})) for sc in c.BOARD["scenes"]])
    return board, sty


def zoom(img, t, cam):
    """Storyboard camera on a full-res frame: push in to `focus` by `zoom` over `push`, back out over `pull`."""
    z = 1.0 + cam["zoom"] * ease_io(prog(t, *cam["push"])) - cam["zoom"] * ease_io(prog(t, *cam["pull"]))
    if z == 1.0:
        return img
    fx, fy = cam["focus"]
    cw, ch = W / z, H / z
    ox = clamp(fx - cw / 2, 0, W - cw)
    oy = clamp(fy - ch / 2, 0, H - ch)
    return img.resize((W, H), Image.BICUBIC, box=(ox, oy, ox + cw, oy + ch))


def frame(sty, A, board, t):
    """The style's canvas for time t: the current scene, dissolving in from the previous one if it has an `enter`."""
    scenes = board["scenes"]
    i = max(k for k, sc in enumerate(scenes) if sc["start"] <= t)
    sc = scenes[i]
    cv = sty.scene(A, sc, t - sc["start"], t)
    x = sc.get("enter")
    if x:
        u = prog(t, sc["start"], x["until"])
        if u < 1:
            prev = scenes[i - 1]
            th = x.get("hold")  # freeze the outgoing scene at `hold`, or (None) keep it running
            th = t if th is None else th
            cv = sty.transition(sty.scene(A, prev, th - prev["start"], th, text=False), cv, ease_io(u))
    return cv


def preview(clip, style, outdir, times):
    board, sty = load(clip, style)
    A = sty.assets()
    os.makedirs(outdir, exist_ok=True)
    for t in times:
        sty.reset(A, board)
        sty.advance(A, round(t * FPS))
        sty.to_rgb(frame(sty, A, board, t), check=True).save(os.path.join(outdir, f"{t:05.2f}.png"))


_W = None  # per-worker (style, assets, board)


def _init(clip, style):
    global _W
    board, sty = load(clip, style)
    _W = sty, sty.assets(), board


def _frame_bytes(i):
    sty, A, board = _W
    return sty.to_rgb(frame(sty, A, board, i / FPS)).tobytes()


def frames(clip, style):
    """Yield every frame as RGB bytes, in order. Stateless styles render in parallel; stateful ones step sequentially."""
    board, sty = load(clip, style)
    n = int(board["dur"] * FPS)
    if sty.stateful:
        A = sty.assets()
        sty.reset(A, board)
        for i in range(n):
            sty.advance(A, i)
            yield sty.to_rgb(frame(sty, A, board, i / FPS)).tobytes()
        return
    with Pool(max(1, min(8, (os.cpu_count() or 2) - 1)), _init, (clip, style)) as pool:
        yield from pool.imap(_frame_bytes, range(n), chunksize=4)


def render(clip, style, out):
    board, _ = load(clip, style)
    dur, audio = board["dur"], board.get("audio")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    t0 = time.time()
    with tempfile.TemporaryDirectory() as tmp:
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-"]
        vf = ["-vf", f"fade=t=in:st=0:d=0.3,fade=t=out:st={dur - 0.4}:d=0.4", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
              "-pix_fmt", "yuv420p"]
        if audio:
            wav = os.path.join(tmp, "a.wav")
            make_audio(wav, dur, audio["chimes"], audio["gust"])
            cmd += ["-i", wav] + vf + ["-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out]
        else:
            cmd += vf + ["-movflags", "+faststart", "-an", out]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        for buf in frames(clip, style):
            ff.stdin.write(buf)
        ff.stdin.close()
        if ff.wait():
            raise SystemExit(f"ffmpeg failed with {ff.returncode}")
    return time.time() - t0
