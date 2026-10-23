"""Slow lane: 18 s, synthesised wind + chimes. Prompt and intent: slow_lane.md.

Beats: 0-3 hook, 1-10 a sea turtle glides across the meadow at its own pace while a rabbit, a squirrel and a mouse dash in
and settle beside it, 10.4-13.6 payoff, 14.5-18 end card. Appart storyboard. Positions are 1080x1920 pixels.
"{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=8.0, chimes=[(4.6, 523), (6.0, 659), (7.0, 784), (10.0, 988), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            cast=dict(
                turtle=dict(kind="sea_turtle", motion="slide", enter=1.0, dur=9.0, x0=-260, x1=470, y=1700, scale=1.0,
                            bob=0.02, shadow=(340, 56, 70)),
                rabbit=dict(kind="rabbit", motion="hop", enter=1.6, dur=3.0, x0=1350, x1=190, y=1480, hops=4, apex=140,
                            scale=1.0, flip=True, shadow=(340, 56, 70)),
                squirrel=dict(kind="squirrel", motion="hop", enter=3.4, dur=2.6, x0=-250, x1=880, y=1560, hops=3, apex=110,
                              scale=0.7, shadow=(240, 44, 70)),
                mouse=dict(kind="mouse", motion="slide", enter=5.0, dur=2.0, x0=1350, x1=860, y=1760, scale=0.55, flip=True,
                           shadow=(180, 34, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="No rush.", y=330, size=140, pop=(0.2, 0.8)),
                ]),
                dict(show=(10.4, 14.2), fade_in=(10.4, 11.0), fade_out=(13.9, 14.2), lines=[
                    dict(s="Take your time.", y=300, size=108, rise=(10.4, 11.0), dy=24),
                    dict(s="They'll wait.", y=430, size=108, rise=(10.6, 11.2), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="sea_turtle", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}


VARIANTS = {  # "meadow" is the base cast, so the posted `slow-lane-appart` is the same unit
    "meadow": {},
    "pond": dict(meadow=dict(cast=dict(rabbit=dict(kind="duck"), squirrel=dict(kind="frog"), mouse=dict(kind="otter", scale=0.7)))),
    "woodland": dict(meadow=dict(cast=dict(rabbit=dict(kind="fox"), squirrel=dict(kind="hedgehog"), mouse=dict(kind="chicken")))),
}
