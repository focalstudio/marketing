# picnic_for_four_pixel: the prompt behind the video

An 18-second vertical video (1080×1920, 30 fps) for WildFocus in the **pixel art** look (video/canvas/pixel.mjs), drawn in canvas code. The scene is
[scenes/picnic_for_four_pixel.mjs](scenes/picnic_for_four_pixel.mjs); its style sheet is [scenes/picnic_for_four_pixel_style.mjs](scenes/picnic_for_four_pixel_style.mjs). It is one of three looks of the same story
(`picnic_for_four_iso`, `picnic_for_four_pixel`, `picnic_for_four_flat`): same beats, same captions, same sound.

**Story: Picnic for four.** A rabbit sits on a picnic rug, bent over its phone. A fox, a deer and a hedgehog turn up with a basket and wait,
then try to get its attention one by one. The rabbit looks up and puts the phone face down on a stump. The picnic starts: a carrot passed
round, a laugh, everyone bouncing. It ends with the four of them sitting together at golden hour. Theme: put the phone down, enjoy your
friends. This is about the friends, not about shy animals (that is `phone_down`). Written for consumers (`voice.md`): plain words, British spelling.

| Time | Beat | Caption |
|---|---|---|
| 0-3.8 | Rabbit alone on the rug, thumb scrolling; the fox, deer and hedgehog walk in with a basket and settle round it | "Put the phone down. / Your friends are here." (hook, on screen from frame 0) |
| 4.2-8 | The phone buzzes twice; the hedgehog nudges, the deer tilts its head, the fox waves, one after another | "They've been waiting." |
| 8.4-12 | The rabbit looks up, puts the phone face down on a stump at 9 s; the picnic starts: a carrot goes round, a laugh, everyone hops | "Share the snack, / not the screen." |
| 12.2-14.6 | The four sit close together, the sky warms to golden hour, a sparkle at 12.6 s | "Best company there is." |
| 14.8-18 | The shared end card (`endCard`): icon, WildFocus, "Just focus on / what matters.", "Free on iOS" | |

- **Sound.** `SOUND.kind: "toon"` (`toonArgv` in `audio.mjs`), full level from frame 0: a buzz at 1.2 s and 3 s, a thunk as the phone goes face down
  at 9 s, hops during the picnic, a sparkle at 12.6 s, `done` on the end card. The `-silent.mp4` copy is for adding a platform sound.
- **Look.** pixel art: see `video/styles/cards/pixel-art.md`.
