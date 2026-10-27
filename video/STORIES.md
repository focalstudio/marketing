# Stories

One storyboard per clip in [clips/](clips/) (`.py` is the data, `.md` the prompt behind it). A clip never imports a style;
the style decides how it looks. Copy (hooks, titles) lives in [apps/wildfocus.yml](../apps/wildfocus.yml), three of each per
clip so a reused clip rotates its words. Posted weeks: `ls queue/*/wildfocus-<clip>*`.

| Clip | Premise | Length | Cast and variants | Styles |
|---|---|---|---|---|
| `meditate` | Sit still and the animals join you | 16 s | rabbit, fox, deer, hedgehog | toon, lowpoly, pixel, ink, paper, storybook |
| `collect` | Every 25 minutes of focus, someone new moves in | 18 s | meadow (rabbit, fox, hedgehog), woodland, pond, farm | paper, storybook |
| `phone_down` | They only come out when the phone is down | 18 s | meadow, pond, woodland | paper, storybook |
| `night_owls` | Late-night study with the night shift | 17 s | meadow (rabbit, owl, bat), deer, fox | paper, storybook |
| `rare_find` | Seven days of focus and something rare shows up | 19 s | snow leopard, polar bear, red panda, tiger, lynx, wolf | paper, storybook |
| `slow_lane` | Nothing here is in a hurry | 18 s | meadow, pond, woodland | paper, storybook |
| `stay_awhile` | One session and the meadow comes to you | 18 s | meadow, pond, woodland | paper, storybook |
| `short_break` | Five minutes off, with company | 18 s | meadow, farm, woodland | paper, storybook |

Posts already published in `appart` (W43-W44 queue) keep their media; new ones render in the drawn styles.

## How a story should open (Shorts and TikTok)

The first line of text is on screen and readable within a second, and the premise is clear by 3 s. No empty opening shot.
Hook lines are one sentence a person would say. See "Shorts: what we optimise for" in [GROWTH.md](../GROWTH.md).

## How a story should end

Every video ends on the same card, held for at least 3 s: the real app icon as a sticker, "WildFocus", **"Just focus on /
what matters."** and a small "Free on iOS". It applies to every new video, drawn story or canvas scene, whatever the
style or engine. In canvas scenes call `endCard` from [canvas/cel.mjs](canvas/cel.mjs) (`CLOSING` and `STORE` hold the words)
and set `END.from` after the last caption; do not draw your own. The words come from the rain video's closing line.
`rain_outside` and `focus_rabbit` predate the rule and keep their own cards.

## Story ideas

Built only from props the storyboards already have (timer, counter, phone, sky tint and stars, leaves, pop, hop, slide,
peek, freeze), so the drawn styles play them without new code:

1. **First light**: dawn tint, stars fade, the rabbit then a deer peek over the ridge, a 25:00 timer starts.
2. **25 on, 5 off**: two timers back to back; animals pop in for the focus, wander off for the break.
3. **Notification storm**: the phone buzzes three times and everyone freezes each time; face down, they relax.
4. **Exam week**: a day counter (Day 1/5 ... 5/5), one more visitor each day, the hero deer last.
5. **Tiny visitors**: mouse, frog and hedgehog peek up one by one; "small focus counts".
6. **Midnight oil**: stars and a bat hopping across the sky while the owl keeps the timer.
7. **Let it blow past**: leaves drift through, animals walk in and sit; "the day can wait".

## Canvas videos (drawn in code)

[canvas/](canvas/) draws a whole scene in a browser canvas, as a naturalist engraving (ink, hatching, watercolour, paper),
and records it frame by frame from headless Chrome: `node video/canvas/render.mjs <name>` (`--preview DIR "1,5,9"` for
stills, `--size 1080x1080` for square). These videos sell the feeling (switching off) rather than the app. A scene is
`canvas/scenes/<name>.mjs` (`DURATION`, `SCENES`, `CAPTIONS`, `SOUND`, `setup`, `draw`), and its prompt is `canvas/<name>.md`.

| Video | Premise | Length |
|---|---|---|
| `rain_outside` | The life of a raindrop, from the window to the cloud to the puddle (engraving, no animals) | 30 s |
| `focus_rabbit` | One rabbit's 25-minute focus session, with a fox moving in at the end (Kawaii Chibi: `canvas/toon.mjs`) | 30 s |
| `studio_intro` | Who Focal Studio is, what it values and its first app, narrated over synthesised music; the video we pin on every profile. A kawaii bunny animation (`canvas/kawaii.mjs`) with the app's low-poly animals on rarity cards; voice WAV in `canvas/voice/` | 45 s |
| `last25` | The last 25 minutes of an evening: a rooftop at dusk, a pocket watch, an impact frame and a time-lapse into night (anime-cel: `canvas/cel.mjs`; city sound that gives way to a focus sound) | 18.5 s |
| `picnic_for_four_pixel` | Put the phone down and your friends (fox, deer, hedgehog) join the rabbit's picnic; one story in three looks, with a lofi bed (`audio.mjs` `lofi`). Pixel art, side-on (`canvas/pixel.mjs`) | 18 s |
| `picnic_for_four_iso` | The same story as an isometric pixel meadow (`canvas/pixel.mjs`) | 18 s |
| `picnic_for_four_flat` | The same story as flat two-tone mascot art (Fredoka) | 18 s |

## Review gates

Before any full render of a new video, show two images and wait for approval of each: a style sheet (the characters, props, type,
palette and any app art, as a one-frame scene `scenes/<name>_style.mjs`) and a keyframe sheet (one labelled still per beat:
`node video/canvas/render.mjs <name> --sheet OUT.png "t1,t2,..."`, labels from the scene's `BEATS`). Renders are slow, so a look
the owner dislikes is caught before it costs one. `studio_intro` is the first video made this way.

`studio_intro` shows the app's own low-poly animal art, an exception to "animated originals only" in [GROWTH.md](../GROWTH.md),
made at the owner's request for the app segment; its bunnies are drawn in code.
