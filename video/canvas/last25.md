# Last 25: the prompt behind the video

An 18.5-second vertical video (1080×1920, 30 fps) for WildFocus, drawn in canvas code in the **anime-cel** look: flat colour
bands, one hard shadow per shape, a tapered ink outline, a muted palette with one red accent, letterbox bars and grain.
General traits only: no series, characters or marks. The rabbit is the house rabbit, as a flat ink silhouette. The kit is
[cel.mjs](cel.mjs) and the scene is [scenes/last25.mjs](scenes/last25.mjs).

One evening, 25 minutes, told in 18.5 s:

- **0-3.2 s, hook.** A rooftop at dusk: five flat sky bands, a red sun, a skyline, the rabbit sitting on the roof edge in
  silhouette. Text from frame 0: "The last **25 minutes** of the day." A slow push on the whole frame.
- **3.2-7 s.** Hard cut to a pocket-watch macro (10:08) with a cel shadow and tapered ink. The camera pushes in, the second
  hand ticks. "Phone down."
- **7 s, impact.** Two frames with every colour inverted, speed lines and a big "Start." (frames 210 and 211), with a
  thunder clap on the rain bed.
- **7.1-14 s, time-lapse.** The watch pulls back and the minute hand sweeps 25 minutes while the sky goes from dusk to night:
  the sun sinks, the moon rises, stars appear, the windows light up. "25 minutes. Nothing else." The rabbit does not move.
- **14-15.3 s.** The watch leaves; a calm night wide shot.
- **15.3-18.5 s.** The shared end card, the same in every video: the real WildFocus icon as a sticker, "WildFocus", "Just focus
  on / what matters." and "Available on iOS", on night blue.
- **Sound.** Made in ffmpeg (`cityArgv`): a city (traffic rumble, hiss, a few horns, a far siren) from the first frame, ducking
  with a riser into the impact, where the street cuts out at once with a low boom. Then the focus sound: a soft pad, room
  tone and clock ticks, until a chime at 14 s. A soft chime as the end card arrives. `-silent.mp4` is for adding a platform sound.

Why this look in canvas 2D: the engine spike (docs/decisions/0001-style-library.md) found canvas 2D, WebGL and Blender
almost indistinguishable on this shot, and canvas 2D is the cheapest to render and edit.
