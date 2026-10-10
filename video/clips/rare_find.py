"""Rare find: 19 s, synthesised wind + chimes. Prompt and intent: rare_find.md.

Beats: 0-3 hook, 0.6-8.4 a counter goes Day 1 -> 7 and a small animal pops in on each of days 2-6, 8.4-10.4 a pause as the
light warms, 10.4-13.2 a rare animal rises from the grass, 12-15.2 payoff, 15.6-19 end card. Appart storyboard;
VARIANTS swap the rare animal. Positions are 1080x1920 pixels. "{app}" stands for the app's name (core.load fills it in).
"""

DUR = 19.0
DAYS = [0.6, 1.9, 3.2, 4.5, 5.8, 7.1, 8.4]  # when the counter reads Day 1 .. Day 7
REVEAL = 10.4
END = 15.6

BOARD = dict(
    dur=DUR,
    audio=dict(gust=12.8, chimes=[(DAYS[1], 523), (DAYS[2], 587), (DAYS[3], 659), (DAYS[4], 698), (DAYS[5], 784),
                                  (REVEAL + 2.8, 988), (REVEAL + 3.0, 1319), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            sky=dict(dusk=(8.4, 11.0), horizon=1000),
            counter=dict(x=540, y=780, size=110, steps=[(t, f"Day {i + 1}/7") for i, t in enumerate(DAYS)]),
            cast=dict(
                s1=dict(kind="mouse", motion="pop", enter=DAYS[1], x=190, y=1520, scale=0.6, shadow=(200, 38, 70)),
                s2=dict(kind="frog", motion="pop", enter=DAYS[2], x=890, y=1540, scale=0.6, flip=True, shadow=(200, 38, 70)),
                s3=dict(kind="duck", motion="pop", enter=DAYS[3], x=330, y=1730, scale=0.65, shadow=(200, 38, 70)),
                s4=dict(kind="hedgehog", motion="pop", enter=DAYS[4], x=770, y=1720, scale=0.6, flip=True, shadow=(200, 38, 70)),
                s5=dict(kind="squirrel", motion="pop", enter=DAYS[5], x=110, y=1750, scale=0.6, shadow=(200, 38, 70)),
                rare=dict(kind="snow_leopard", motion="peek", enter=REVEAL, dur=2.8, x=540, y=1560, scale=1.45, bob=0.03,
                          shadow=(520, 80, 80)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="Seven days", y=330, size=132, pop=(0.2, 0.8)),
                    dict(s="of focus.", y=490, size=132, pop=(1.1, 1.7)),
                ]),
                dict(show=(12.0, 15.3), fade_in=(12.0, 12.6), fade_out=(15.0, 15.3), lines=[
                    dict(s="Then this", y=300, size=116, rise=(12.0, 12.6), dy=24),
                    dict(s="showed up.", y=440, size=116, rise=(12.2, 12.8), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="snow_leopard", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}


def rare(kind):
    return dict(meadow=dict(cast=dict(rare=dict(kind=kind))), end=dict(mascot=dict(kind=kind)))


VARIANTS = {  # the base board is the first; each is its own post
    "snow_leopard": {},
    "polar_bear": rare("polar_bear"),
    "red_panda": rare("red_panda"),
    "tiger": rare("tiger"),
}
