"""Leaf fall: 18 s, synthesised wind + chimes. Prompt and intent: leaf_fall.md.

Beats: 0-3 hook, 1-10 a sheep sits in the meadow while a 25:00 timer runs and the leaves drift down, a squirrel peeks
from the grass and a goose glides in to watch, 10.4-13.6 payoff, 14.5-18 end card. Appart storyboard.
Positions are 1080x1920 pixels. "{app}" stands for the app's name (core.load fills it in).
"""

DUR = 18.0
END = 14.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=2.0, chimes=[(5.2, 523), (7.6, 659), (10.6, 784), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            leaves=dict(n=16, start=1.6, stagger=0.45, dur=3.2),
            timer=dict(x=540, y=700, size=120, run=(1.0, 10.0), from_=25 * 60, fade=(0.3, 0.9)),
            hero=dict(kind="sheep", x=540, y=1560, scale=1.15, bob=0.02, shadow=(380, 60, 70)),
            cast=dict(
                squirrel=dict(kind="squirrel", motion="peek", enter=5.0, dur=1.4, x=170, y=1480, scale=0.7,
                              shadow=(240, 44, 70)),
                goose=dict(kind="goose", motion="slide", enter=7.0, dur=3.2, x0=1350, x1=860, y=1720, scale=0.85,
                           flip=True, shadow=(300, 50, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="Leaves fall.", y=330, size=140, pop=(0.2, 0.8)),
                    dict(s="You stay.", y=490, size=140, pop=(1.2, 1.8)),
                ]),
                dict(show=(10.4, 14.2), fade_in=(10.4, 11.0), fade_out=(13.9, 14.2), lines=[
                    dict(s="Nothing to chase.", y=300, size=104, rise=(10.4, 11.0), dy=24),
                    dict(s="Just the season.", y=430, size=104, rise=(10.6, 11.2), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="sheep", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}
