"""Leaf fall: 19 s, synthesised wind + chimes. Prompt and intent: leaf_fall.md.

Beats: 0-3.4 hook, 1-10.4 a 25:00 timer runs down while a red panda sits and autumn leaves drift across, a squirrel hops in,
a goose glides over and a hedgehog peeks up from the grass, 10.8-14.4 payoff, 15.5-19 end card. Appart storyboard.
Positions are 1080x1920 pixels. "{app}" stands for the app's name (core.load fills it in).
"""

DUR = 19.0
END = 15.5

BOARD = dict(
    dur=DUR,
    audio=dict(gust=2.2, chimes=[(5.0, 523), (7.4, 659), (9.4, 784), (10.8, 988), (END + 0.45, 659), (END + 0.65, 988)]),
    scenes=[
        dict(
            name="meadow", start=0.0, kind="world",
            timer=dict(x=540, y=700, size=120, run=(1.0, 10.4), fade=(0.3, 0.9)),
            leaves=dict(n=14, start=2.2, stagger=0.55, dur=2.8),
            hero=dict(kind="red_panda", x=540, y=1480, scale=1.2, shadow=(380, 60, 70)),
            cast=dict(
                squirrel=dict(kind="squirrel", motion="hop", enter=4.0, dur=2.2, x0=-250, x1=210, y=1640, hops=3, apex=110,
                              scale=0.7, shadow=(240, 44, 70)),
                goose=dict(kind="goose", motion="slide", enter=6.4, dur=2.6, x0=1350, x1=860, y=1600, scale=0.85, flip=True,
                           bob=0.02, shadow=(300, 50, 70)),
                hedgehog=dict(kind="hedgehog", motion="peek", enter=8.6, dur=1.6, x=620, y=1770, scale=0.65, bob=0.02,
                              shadow=(220, 40, 70)),
            ),
            text=[
                dict(show=(0, 3.4), fade_out=(2.9, 3.3), lines=[
                    dict(s="Leaves fall.", y=330, size=132, pop=(0.2, 0.8)),
                    dict(s="Timer runs.", y=490, size=132, pop=(1.1, 1.7)),
                ]),
                dict(show=(10.8, 15.2), fade_in=(10.8, 11.4), fade_out=(14.9, 15.2), lines=[
                    dict(s="Let it fall.", y=300, size=112, rise=(10.8, 11.4), dy=24),
                    dict(s="Keep going.", y=430, size=112, rise=(11.0, 11.6), dy=24),
                ]),
            ],
        ),
        dict(
            name="end", start=END, kind="end", enter=dict(until=END + 0.4, hold=END - 0.01),
            mascot=dict(kind="red_panda", x=540, y=1800, scale=1.0),
            icon=dict(size=320, y=760, pop=(0.25, 0.95), bob=8),
            text=[dict(lines=[
                dict(s="{app}", y=1040, size=124, fill="ink", plain=True, fade=(0.9, 1.5)),
                dict(s="Free on iOS.", y=1190, size=80, fill="sage", plain=True, fade=(1.3, 1.9)),
            ])],
        ),
    ],
)

OVERRIDES = {}
