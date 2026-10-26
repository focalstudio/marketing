# Studio intro: the prompt behind the video

A 45-second vertical video (1080×1920, 30 fps) that introduces Focal Studio to a new follower, pinned on every profile. A 2D
kawaii animation: flat white bunnies with one thick plum outline, pink inner ears, blush and dot eyes on pastel pages, one
keyword per voice line, very basic motion (breathing, blinks, ear flicks, one hop). The kit is [kawaii.mjs](kawaii.mjs), the
scene [scenes/studio_intro.mjs](scenes/studio_intro.mjs), the look sheet [scenes/studio_intro_style.mjs](scenes/studio_intro_style.mjs)
and the sound `introArgv` in [audio.mjs](audio.mjs).

The bunnies are our own drawing. A bunny that holds something has chunky elbowed arms (`arm` in the kit) that join its body with no line, and only those arms; resting bunnies keep the plain "U" arms. The WildFocus segment uses the app's low-poly animals (the PNGs in the app repo), framed in the
app's rarity colours and labels, at the owner's request.

## Beats

| t (s) | Voice | Visual | Keyword |
|---|---|---|---|
| 0-5 | "Your phone was built to keep you scrolling." | Three bunnies on pink; the middle one holds a phone up to its face with both arms, seen from behind, its glow on the ears | Scroll. |
| 5-11 | "We're Focal Studio. We make apps that do the opposite." | It winds up and throws the phone off to the right (the paws let go of it), then hops and looks over its shoulder at us | Focal Studio |
| 11-14.5 | "We want to disconnect from the everyday noise," | One bunny, eyes shut, breathing, on mint | Disconnect |
| 14.5-17.3 | "and reconnect with your life" | A snail crosses the page, on peach | Reconnect |
| 17.3-22 | "and your goals." | Three bunnies on a meadow, on sky blue: one paints at an easel, one reads a classic (Alice in Wonderland) with its cover towards us, one lifts a dumbbell | Your goals |
| 22.5-31 | "Our first app is WildFocus. It's a focus timer that rewards you. Every twenty-five minutes adds a new animal to your collection." | The app icon runs a 25-minute ring; rabbit (Common), fox (Uncommon) and otter (Rare) pop in on cards | 25 min, Collect |
| 31-35.5 | "Finish daily challenges to find rare animals more often." | A checklist ticks three boxes; the orangutan card (Endangered, the legendary tier) rises with a glow | Challenges, Legendary |
| 35.5-38 | "More apps are on the way." | The WildFocus icon and two "?" tiles | More soon |
| 38-41.5 | "Every app we make has one job: to give you your time back." | The three bunnies, together | Your time |
| 41.5-45 | "Just focus on what matters." | The shared end card ("Free on iOS") | |

The 11-22 s sentence is one idea in three beats, the three lines read a little slower (speed 0.85) to feel calm. In the app, completing daily challenges raises the chance of a rare animal; the video says no more than that. The narration is in
intermediate English: short sentences, common words.

## Sound

Music is synthesised: a soft piano arpeggio (C, G, Am, F) over a low pad at 70 bpm, no vocals, as in `apps/wildfocus.yml`
(`music:`), and a chime as the end card arrives. The voice is [voice/studio_intro.wav](voice/studio_intro.wav), Kokoro (`bf_emma`,
British, speed 0.95, Apache-2.0, run locally with `kokoro-onnx` and espeak-ng). Each line is synthesised on its own and placed at a
fixed time (0.3, 5.2, 11.2, 14.6, 17.3, 22.5, 31.3, 36, 38 and 42 s; each ends at least 0.3 s before the next), so the WAV is 45 s long and `voiceAt` is 0; the music ducks
under it. It is synthetic: keep `ai_label: true` in `apps/wildfocus.yml`. With no WAV the video renders music only. To change a
line, redo that line and its keyword together; keywords start a beat after the voice and end before the next line.

## Review

Gate 1 is the style sheet (`render.mjs studio_intro_style --preview DIR 0`); gate 2 is a contact sheet of one still per beat
(`render.mjs studio_intro --sheet OUT.png "0.5,3,7,..."`, the labels come from `BEATS`). Both are approved before the full render.
